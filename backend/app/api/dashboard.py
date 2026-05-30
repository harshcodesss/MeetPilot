# Dashboard read endpoints. Auth-gated, owner-scoped.
# Deletable on the day the real frontend ships.

from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.ownership import _require_owned_session
from app.database import get_db
from app.models import SegmentDB, SessionDB, TaskDB, User

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic response schemas
# ---------------------------------------------------------------------------

class SessionListItem(BaseModel):
    session_id: str
    started_at: datetime
    status: str
    title: str | None
    segment_count: int
    task_count: int
    # Frontend Phase 0.6 — Meetings list cards show a "drafts ready" badge and an
    # "awaiting answers" badge per session. Server-side counts here avoid an
    # N+1 trip from the list page and match the Tasks board column definitions
    # exactly (placement='main_list', is_done=false, draft_state=<state>).
    drafts_ready_count: int
    awaiting_count: int

    model_config = {"from_attributes": True}


class SessionDetail(BaseModel):
    session_id: str
    started_at: datetime
    status: str
    title: str | None
    segment_count: int
    task_count: int

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    task_id: str
    assignee: str
    action: str
    deadline_raw: str | None
    deadline_date: date | None
    type: str
    confidence: str
    placement: str
    source_seq: list[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/me/sessions", response_model=list[SessionListItem])
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List every session owned by the caller, newest first, with at-a-glance counts."""
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
    # The two badge counters mirror the Tasks-board columns exactly: only
    # tasks that would actually appear in "Ready to Use" / "Needs Your Input"
    # count toward the badge. Same filter discipline as /me/stats (Phase 0.3
    # review) — placement='main_list' AND is_done=false AND draft_state=<state>.
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


@router.get("/session/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Single session metadata with segment and task counts."""
    session = _require_owned_session(session_id, user, db)
    segment_count = (
        db.query(func.count())
        .filter(SegmentDB.session_id == session_id)
        .scalar()
    )
    task_count = (
        db.query(func.count())
        .filter(TaskDB.session_id == session_id)
        .scalar()
    )
    return SessionDetail(
        session_id=session.session_id,
        started_at=session.started_at,
        status=session.status,
        title=session.title,
        segment_count=segment_count,
        task_count=task_count,
    )


@router.get("/session/{session_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """All extracted tasks for a session, in chronological (worker-produced) order."""
    _require_owned_session(session_id, user, db)
    rows = (
        db.query(TaskDB)
        .filter(TaskDB.session_id == session_id)
        .order_by(TaskDB.created_at)
        .all()
    )
    return rows
