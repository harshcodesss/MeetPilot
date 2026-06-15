"""Phase B Task 6 — accept user answers to a handler's clarifying questions
and unblock drafting.

Separate router (not folded into dashboard.py) because answers will outlive
the throwaway dashboard — the real frontend will hit the same endpoint.

Flow:
  1. Auth + ownership check on the task (401/404/403).
  2. State check: task must be in `awaiting_answers` (409 otherwise).
  3. Validate every submitted question-id matches a stored question
     (400 on unknown ids). Missing ids are allowed — partial answers
     are valid; the prompt's three-way rendering (CR-3) handles them.
  4. Persist `answers` + flip `draft_state` → `answered`.
  5. Enqueue `draft_task(task_id)` so the worker re-runs the handler
     with `answers` populated. Return 202 Accepted.

Decision 7 (LOCKED): persistence happens BEFORE enqueue. If the enqueue
raises (e.g. Redis is down) the endpoint 500s but the answers are safe;
an admin can recover with a manual `enqueue_draft_task(task_id)` call
from a REPL or a maintenance script. The alternative (enqueue first,
persist second) would risk the worker reading `task.answers = None`.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.ownership import _require_owned_task
from app.database import get_db
from app.models import User
from app.queue.client import enqueue_draft_task

router = APIRouter()


class AnswersIn(BaseModel):
    answers: dict[str, str]


class AnswersAccepted(BaseModel):
    task_id: str
    draft_state: str


@router.post(
    "/tasks/{task_id}/answers",
    status_code=202,
    response_model=AnswersAccepted,
)
def submit_answers(
    task_id: str,
    body: AnswersIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Accept user answers to a handler's clarifying questions and re-enqueue drafting.

    Validates ownership, state, and question-id membership; persists answers;
    flips draft_state to 'answered'; then enqueues draft_task. See module
    docstring for the full Decision 7 persistence-before-enqueue rationale.
    """
    task = _require_owned_task(task_id, user, db)

    if task.draft_state != "awaiting_answers":
        raise HTTPException(
            status_code=409,
            detail=(
                f"Task is in state {task.draft_state!r}; "
                "answers can only be submitted on tasks awaiting them."
            ),
        )

    known_ids = {q["id"] for q in (task.questions or [])}
    unknown = set(body.answers) - known_ids
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown question id(s): {sorted(unknown)}",
        )

    # Decision 7: persist first, enqueue second.
    task.answers = body.answers
    task.draft_state = "answered"
    db.commit()

    enqueue_draft_task(task_id)

    return AnswersAccepted(task_id=task_id, draft_state="answered")
