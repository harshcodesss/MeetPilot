"""All `/me/*` reads.

  - `/me/stats`                          — four dashboard top-row counters
  - `/me/tasks`                          — cross-meeting task list
  - `/me/tasks/deadlines`                — Calendar feed
  - `/me/sessions`                       — Meetings list with badge counts
  - `/me/sessions/{id}`                  — Meeting Detail (session + tasks)
  - `/me/sessions/{id}/transcript`       — Meeting Detail transcript pane

Every endpoint is auth-gated via `get_current_user`. Session-scoped endpoints
additionally run `_require_owned_session` for the 401 → 404 → 403 ladder.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.tasks import TaskOut
from app.auth.dependencies import get_current_user
from app.auth.ownership import _require_owned_session
from app.database import get_db
from app.models import SegmentDB, SegmentOut, SessionDB, TaskDB, User

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


# ---------------------------------------------------------------------------
# GET /me/sessions — Meetings list with badge counts (migrated from
# dashboard.py in Phase 10 Step C alongside the alias-route deletion)
# ---------------------------------------------------------------------------


class SessionListItem(BaseModel):
    session_id: str
    started_at: datetime
    status: str
    title: str | None
    segment_count: int
    task_count: int
    # The Meetings list cards show "drafts ready" / "awaiting answers" badges
    # per session. Server-side counts here avoid an N+1 trip from the list
    # page and mirror the Tasks board column definitions exactly
    # (placement='main_list', is_done=false, draft_state=<state>).
    drafts_ready_count: int
    awaiting_count: int

    model_config = {"from_attributes": True}


@router.get("/me/sessions", response_model=list[SessionListItem])
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List every session owned by the caller, newest first, with at-a-glance
    counts. Used by `/dashboard` (top 5 slice) and `/meetings` (full list)."""
    # Scalar subqueries avoid the cartesian-product double-counting risk
    # that a single grouped outerjoin on two tables would introduce.
    seg_sub = (
        select(func.count())
        .where(SegmentDB.session_id == SessionDB.session_id)
        .correlate(SessionDB)
        .scalar_subquery()
    )
    task_sub = (
        select(func.count())
        .where(
            TaskDB.session_id == SessionDB.session_id,
            TaskDB.placement != "dismissed",
        )
        .correlate(SessionDB)
        .scalar_subquery()
    )
    drafts_ready_sub = (
        select(func.count())
        .where(
            TaskDB.session_id == SessionDB.session_id,
            TaskDB.draft_state == "drafted",
            TaskDB.is_done.is_(False),
            TaskDB.placement == "main_list",
        )
        .correlate(SessionDB)
        .scalar_subquery()
    )
    awaiting_sub = (
        select(func.count())
        .where(
            TaskDB.session_id == SessionDB.session_id,
            TaskDB.draft_state == "awaiting_answers",
            TaskDB.is_done.is_(False),
            TaskDB.placement == "main_list",
        )
        .correlate(SessionDB)
        .scalar_subquery()
    )
    rows = (
        db.query(
            SessionDB,
            seg_sub.label("segment_count"),
            task_sub.label("task_count"),
            drafts_ready_sub.label("drafts_ready_count"),
            awaiting_sub.label("awaiting_count"),
        )
        .filter(SessionDB.user_id == user.user_id)
        .order_by(SessionDB.started_at.desc())
        .all()
    )
    return [
        SessionListItem(
            session_id=row.SessionDB.session_id,
            started_at=row.SessionDB.started_at,
            status=row.SessionDB.status,
            title=row.SessionDB.title,
            segment_count=row.segment_count,
            task_count=row.task_count,
            drafts_ready_count=row.drafts_ready_count,
            awaiting_count=row.awaiting_count,
        )
        for row in rows
    ]


# ---------------------------------------------------------------------------
# GET /me/sessions/{id} — Meeting Detail page: session + tasks in one trip
# ---------------------------------------------------------------------------


class SessionEntry(BaseModel):
    """Meeting metadata returned in the consolidated detail response.

    Mirrors the shape of `dashboard.py::SessionDetail` so the frontend can
    use a single Session type for both the list cell and the detail header.
    `segment_count` is here so the detail header can show "N segments" without
    a second trip. `drafts_ready_count` / `awaiting_count` aren't included
    here because the same tasks list ships in the response — the page derives
    them client-side and we avoid a server-vs-client divergence risk.
    """

    session_id: str
    started_at: datetime
    status: str
    title: str | None
    segment_count: int
    task_count: int

    model_config = {"from_attributes": True}


class SessionAndTasksOut(BaseModel):
    session: SessionEntry
    tasks: list[TaskOut]


@router.get("/me/sessions/{session_id}", response_model=SessionAndTasksOut)
def get_session_detail(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Meeting Detail's single round-trip — metadata + ordered tasks.

    Replaces the old `GET /session/{id}` + `GET /session/{id}/tasks` two-call
    pattern (those aliases stay alive until Phase 10 cleanup Step C). Tasks
    are sorted by `created_at` ASC — the worker writes them in roughly the
    order the LLM emitted them, which is the closest thing we have to "order
    of mention in the meeting".

    `placement='dismissed'` is filtered out — dismissed tasks are gone from
    view everywhere by definition (Critical Read 3), so the Meeting Detail
    page never sees them either.
    """
    session = _require_owned_session(session_id, user, db)

    segment_count = (
        db.query(func.count(SegmentDB.id))
        .filter(SegmentDB.session_id == session_id)
        .scalar()
    )
    task_count = (
        db.query(func.count(TaskDB.task_id))
        .filter(
            TaskDB.session_id == session_id,
            TaskDB.placement != "dismissed",
        )
        .scalar()
    )

    tasks = (
        db.query(TaskDB)
        .filter(
            TaskDB.session_id == session_id,
            TaskDB.placement != "dismissed",
        )
        .order_by(TaskDB.created_at.asc())
        .all()
    )

    return SessionAndTasksOut(
        session=SessionEntry(
            session_id=session.session_id,
            started_at=session.started_at,
            status=session.status,
            title=session.title,
            segment_count=segment_count,
            task_count=task_count,
        ),
        tasks=tasks,
    )


# ---------------------------------------------------------------------------
# GET /me/sessions/{id}/transcript — Meeting Detail's transcript pane
# ---------------------------------------------------------------------------


@router.get(
    "/me/sessions/{session_id}/transcript",
    response_model=list[SegmentOut],
)
def get_session_transcript(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Speaker-labeled segments for one meeting, in display order.

    Ordering is `(timestamp, seq)` — timestamp first (Meet's caption clock)
    with `seq` as the tiebreaker for caption lines that finalized in the
    same observer tick. Mirrors the ordering already used by the debug
    `GET /session/{id}/segments` handler in main.py, which stays alive
    during transition and is deleted in Phase 10 Step C.

    The transcript pane scrolls; no pagination in v1 (Critical Read in the
    plan — revisit only if a real long-meeting performance problem surfaces).
    """
    _require_owned_session(session_id, user, db)
    rows = (
        db.query(SegmentDB)
        .filter(SegmentDB.session_id == session_id)
        .order_by(SegmentDB.timestamp.asc(), SegmentDB.seq.asc())
        .all()
    )
    return rows
