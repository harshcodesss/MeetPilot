"""Frontend Phase 0 — task-scoped mutation + read endpoints.

Separate from `answers.py` (POST-only, narrowly scoped to the clarification
loop) and from `dashboard.py` (session-scoped reads under `/me/sessions` and
`/session/...`). This is the place for everything that operates on a single
task by id: `PATCH /tasks/{id}/done`, future `PATCH /tasks/{id}/placement`
(Phase 0.3), `GET /tasks/{id}` (Phase 0.5).

Auth is uniform: every endpoint depends on `get_current_user` and resolves
the task via `_require_owned_task` (401 → 404 → 403 ladder).
"""

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.ownership import _require_owned_task
from app.database import get_db
from app.models import User

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


# ---------------------------------------------------------------------------
# PATCH /tasks/{task_id}/done — toggle the completion flag
# ---------------------------------------------------------------------------

class DoneIn(BaseModel):
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
