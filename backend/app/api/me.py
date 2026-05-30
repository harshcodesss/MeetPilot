"""Frontend Phase 0 — `/me/*` non-session reads.

This module collects every endpoint the frontend hits via `/me/...` that
isn't session-scoped — currently `/me/stats` (0.2), and `/me/tasks` +
`/me/tasks/deadlines` arrive in 0.3 / 0.4. The existing `/me/sessions`
list still lives in `dashboard.py` for now; it migrates here in the Phase
10 cleanup along with the rest of the ugly-dashboard cleanup.

Every endpoint is auth-gated via `get_current_user`. No path here takes a
task or session id directly; those go in `tasks.py` / `dashboard.py`.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

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

    # `drafts_ready` and `action_required` are the "open work" counters —
    # filter out completed (is_done) AND dismissed (placement='dismissed',
    # introduced in Phase 0.3). The dismissed filter is harmless until
    # then; locking it now means we don't have to remember to revisit.
    drafts_ready = (
        db.query(func.count(TaskDB.task_id))
        .join(SessionDB, TaskDB.session_id == SessionDB.session_id)
        .filter(
            SessionDB.user_id == user.user_id,
            TaskDB.draft_state == "drafted",
            ~TaskDB.is_done,
            TaskDB.placement != "dismissed",
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
            TaskDB.placement != "dismissed",
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
