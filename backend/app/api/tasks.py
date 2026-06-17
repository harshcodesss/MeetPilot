"""Frontend Phase 0 — task-scoped mutation + read endpoints.

Separate from `answers.py` (POST-only, narrowly scoped to the clarification
loop) and from `dashboard.py` (session-scoped reads under `/me/sessions` and
`/session/...`). This is the place for everything that operates on a single
task by id: `PATCH /tasks/{id}/done`, `PATCH /tasks/{id}/placement`,
`GET /tasks/{id}`.

Auth is uniform: every endpoint depends on `get_current_user` and resolves
the task via `_require_owned_task` (401 → 404 → 403 ladder).
"""

from datetime import date, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.ownership import _require_owned_task
from app.database import get_db
from app.models import SegmentDB, User

router = APIRouter()


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

class TaskOut(BaseModel):
    """Full task projection — every field the frontend TaskCard needs to render
    any state (extracted / awaiting_answers / answered / drafted, plus the
    done + placement flags). Mirrors `TaskListOut` in the Phase 0.3 plan; the
    same shape is reused by `GET /me/tasks` and `GET /tasks/{id}` later.
    """

    task_id: str
    session_id: str
    assignee: str
    action: str
    deadline_raw: str | None
    deadline_date: date | None
    type: str
    confidence: str
    placement: str
    source_seq: list[int]
    draft_state: str
    handler: str | None
    questions: list[dict[str, Any]] | None
    answers: dict[str, Any] | None
    draft: dict[str, Any] | None
    is_done: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SourceSegmentOut(BaseModel):
    """A single transcript segment cited by a task's `source_seq`. Slim shape —
    only the fields the detail page needs to render the 'Why this task' panel.
    """

    seq: int
    speaker: str
    text: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class TaskDetailOut(TaskOut):
    """`/tasks/{id}` response — TaskOut plus the cited transcript segments.

    The list endpoint (`/me/tasks`) stays lean; only this single-task read
    pays the segment join. Empty list if the task has no `source_seq`.
    """

    source_segments: list[SourceSegmentOut] = []


# ---------------------------------------------------------------------------
# PATCH /tasks/{task_id}/done — toggle the completion flag
# ---------------------------------------------------------------------------

class DoneIn(BaseModel):
    """Request body for `PATCH /tasks/{id}/done` — the desired completion flag."""
    is_done: bool


@router.patch("/tasks/{task_id}/done", response_model=TaskOut)
def set_task_done(
    task_id: str,
    body: DoneIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark a task done or un-done. Idempotent on the value: PATCHing the same
    state twice is a no-op write and still returns 200 + the current task.
    """
    task = _require_owned_task(task_id, user, db)
    task.is_done = body.is_done
    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------------------
# PATCH /tasks/{task_id}/placement — promote / demote / dismiss
# ---------------------------------------------------------------------------

# Distinct from extraction/schemas.py::Placement (LLM-output enum, kept tight
# at main_list|suggested so structured-output mode never exposes 'dismissed'
# to Gemini). This literal is the USER mutation surface; the DB column is a
# String and accepts any of the three values.
PlacementUserValue = Literal["main_list", "suggested", "dismissed"]


class PlacementIn(BaseModel):
    """Request body for `PATCH /tasks/{id}/placement` — the target placement value."""
    placement: PlacementUserValue


@router.patch("/tasks/{task_id}/placement", response_model=TaskOut)
def set_task_placement(
    task_id: str,
    body: PlacementIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Move a task between placements.

    Frontend uses three flows:
      - Promote a suggested task → 'main_list'
      - Demote back to 'suggested' (mostly hypothetical, supported for symmetry)
      - Dismiss a suggested task → 'dismissed' (rejected, filtered from all
        /me/* reads at the API boundary; never appears in any column).

    Idempotent on value. Invalid placement → 422 (Pydantic Literal).
    """
    task = _require_owned_task(task_id, user, db)
    task.placement = body.placement
    db.commit()
    db.refresh(task)
    return task


# ---------------------------------------------------------------------------
# GET /tasks/{task_id} — single-task read (poll target for the answer flow)
# ---------------------------------------------------------------------------


@router.get("/tasks/{task_id}", response_model=TaskDetailOut)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Single task by id, owner-scoped. Adds `source_segments` (the transcript
    lines cited by the task's `source_seq`) so the detail page can render the
    'Why this task' panel without a follow-up fetch.

    The AnswerForm's poll loop (1500 ms cadence, 60 s ceiling) ignores the
    new field — it only reads `draft_state` to know when to swap to the
    DraftView. Each poll carries a few extra rows of transcript text;
    negligible since polls are bounded at ~40 over a 60 s window.
    """
    task = _require_owned_task(task_id, user, db)
    if task.source_seq:
        segments = (
            db.query(SegmentDB)
            .filter(
                SegmentDB.session_id == task.session_id,
                SegmentDB.seq.in_(task.source_seq),
            )
            .order_by(SegmentDB.seq)
            .all()
        )
    else:
        segments = []
    # SQLAlchemy lets us tack the segments onto the ORM instance so Pydantic's
    # from_attributes picks them up via getattr — avoids a manual model_dump.
    task.source_segments = segments  # type: ignore[attr-defined]
    return task
