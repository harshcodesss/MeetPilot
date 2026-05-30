"""Frontend Phase 0 — `/me/*` non-session reads.

This module collects every endpoint the frontend hits via `/me/...` that
isn't session-scoped — currently `/me/stats` (0.2), and `/me/tasks` +
`/me/tasks/deadlines` arrive in 0.3 / 0.4. The existing `/me/sessions`
list still lives in `dashboard.py` for now; it migrates here in the Phase
10 cleanup along with the rest of the ugly-dashboard cleanup.

Every endpoint is auth-gated via `get_current_user`. No path here takes a
task or session id directly; those go in `tasks.py` / `dashboard.py`.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.tasks import TaskOut
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import SessionDB, TaskDB, User

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /me/stats — the four dashboard top-row counters
# ---------------------------------------------------------------------------

# Window for the "this week" stats. Critical read 2: trailing 7 days in
# server UTC, not ISO week boundaries. Surfaced on the response itself
# (`window_days`) so the dashboard tooltip can say "last 7 days".
STATS_WINDOW_DAYS = 7


class StatsOut(BaseModel):
    meetings_this_week: int
    tasks_this_week: int
    drafts_ready: int
    action_required: int
    window_days: int  # echoed back so the UI can label the stat cards


@router.get("/me/stats", response_model=StatsOut)
def get_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Four counts for the dashboard top row, scoped to the calling user.

    Implemented as four small SELECTs inside one transaction (reviewer
    decision over a single COUNT(CASE WHEN ...) query): clearer code,
    each count debuggable in isolation, perf cost invisible at v1 scale.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=STATS_WINDOW_DAYS)

    meetings_this_week = (
        db.query(func.count(SessionDB.session_id))
        .filter(
            SessionDB.user_id == user.user_id,
            SessionDB.started_at >= cutoff,
        )
        .scalar()
    )

    tasks_this_week = (
        db.query(func.count(TaskDB.task_id))
        .join(SessionDB, TaskDB.session_id == SessionDB.session_id)
        .filter(
            SessionDB.user_id == user.user_id,
            SessionDB.started_at >= cutoff,
        )
        .scalar()
    )

    # `drafts_ready` and `action_required` are the "open work" counters that
    # mirror the Tasks board's "Ready to Use" and "Needs Your Input" columns
    # exactly: `placement='main_list'` (excludes `suggested` AND `dismissed`)
    # AND `is_done=false`. Stricter than just `placement != 'dismissed'`
    # because the worker drafts suggested tasks too — counting them in the
    # stat without surfacing them in the column would confuse the user
    # ("stat says 1 ready, column is empty").
    drafts_ready = (
        db.query(func.count(TaskDB.task_id))
        .join(SessionDB, TaskDB.session_id == SessionDB.session_id)
        .filter(
            SessionDB.user_id == user.user_id,
            TaskDB.draft_state == "drafted",
            ~TaskDB.is_done,
            TaskDB.placement == "main_list",
        )
        .scalar()
    )

    action_required = (
        db.query(func.count(TaskDB.task_id))
        .join(SessionDB, TaskDB.session_id == SessionDB.session_id)
        .filter(
            SessionDB.user_id == user.user_id,
            TaskDB.draft_state == "awaiting_answers",
            ~TaskDB.is_done,
            TaskDB.placement == "main_list",
        )
        .scalar()
    )

    return StatsOut(
        meetings_this_week=meetings_this_week,
        tasks_this_week=tasks_this_week,
        drafts_ready=drafts_ready,
        action_required=action_required,
        window_days=STATS_WINDOW_DAYS,
    )


# ---------------------------------------------------------------------------
# GET /me/tasks — cross-meeting task list for the Tasks board
# ---------------------------------------------------------------------------

# Bucket precedence (mirrored client-side in frontend/src/lib/buckets.ts):
#   placement='dismissed' → filtered out everywhere (handled at API boundary)
#   is_done=true          → Done (wins over everything else)
#   placement='suggested' → Suggestions (wins over draft state)
#   draft_state=...       → Ready-to-Use / Needs-Your-Input (main_list only)
BucketName = Literal["drafted", "awaiting", "suggested", "done"]


@router.get("/me/tasks", response_model=list[TaskOut])
def list_tasks(
    bucket: BucketName | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Every task the caller owns, newest first, with full draft payload.

    The full `draft` JSON is included so the Tasks board can render expanded
    cards without a second fetch (critical read 4 — revisit only if a real
    payload-size problem surfaces).

    The frontend buckets client-side in v1; the `?bucket=` query param is the
    server-side counterpart, kept consistent with the client-side buckets so
    future infinite-scroll / per-bucket pagination doesn't need a new endpoint.

    `placement='dismissed'` is always filtered (no opt-in flag to include
    them) — dismissal is "gone from view" by definition.
    """
    q = (
        db.query(TaskDB)
        .join(SessionDB, TaskDB.session_id == SessionDB.session_id)
        .filter(
            SessionDB.user_id == user.user_id,
            TaskDB.placement != "dismissed",
        )
    )

    if bucket == "drafted":
        q = q.filter(
            TaskDB.draft_state == "drafted",
            ~TaskDB.is_done,
            TaskDB.placement == "main_list",
        )
    elif bucket == "awaiting":
        q = q.filter(
            TaskDB.draft_state == "awaiting_answers",
            ~TaskDB.is_done,
            TaskDB.placement == "main_list",
        )
    elif bucket == "suggested":
        q = q.filter(
            TaskDB.placement == "suggested",
            ~TaskDB.is_done,
        )
    elif bucket == "done":
        q = q.filter(TaskDB.is_done)

    rows = q.order_by(TaskDB.created_at.desc()).all()
    return rows


# ---------------------------------------------------------------------------
# GET /me/tasks/deadlines — Calendar page feed
# ---------------------------------------------------------------------------


class TaskDeadlineOut(BaseModel):
    """Slim projection — Calendar page only renders dates + a card preview
    on click; it never expands a full draft inline. Excludes the heavy
    fields (questions, answers, draft) from TaskOut. `assignee` is added
    over the plan spec so the date-cell card can show whose deadline."""

    task_id: str
    session_id: str
    assignee: str
    action: str
    deadline_date: date
    draft_state: str
    handler: str | None
    confidence: str
    placement: str
    is_done: bool

    model_config = {"from_attributes": True}


@router.get("/me/tasks/deadlines", response_model=list[TaskDeadlineOut])
def list_task_deadlines(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Every owned, open, dated, non-dismissed task — sorted by deadline.

    Filters (all ANDed):
      - `deadline_date IS NOT NULL` — only tasks the LLM successfully resolved
        a real date for. Unresolved deadlines (deadline_raw set, deadline_date
        null) don't appear; Meeting Detail is where the user can chase those.
      - `is_done = false` — completed tasks drop off the calendar.
      - `placement != 'dismissed'` — dismissed tasks are gone from view.

    Overdue tasks are INCLUDED (critical read 5: users want to see what they
    missed, not have it hidden). Calendar UI distinguishes past/today/future
    visually (e.g. red/green/neutral dots) using the same deadline_date.
    """
    rows = (
        db.query(TaskDB)
        .join(SessionDB, TaskDB.session_id == SessionDB.session_id)
        .filter(
            SessionDB.user_id == user.user_id,
            TaskDB.deadline_date.isnot(None),
            ~TaskDB.is_done,
            TaskDB.placement != "dismissed",
        )
        .order_by(TaskDB.deadline_date.asc())
        .all()
    )
    return rows
