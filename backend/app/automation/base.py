"""S4 ActionHandler interface — every handler implements one method,
`draft_or_ask`, which either drafts the action's fields or returns the
clarifying questions needed before it can.

The DraftResult / QuestionsResult sealed union keeps the contract explicit:
a handler EITHER produces draft fields OR produces questions, never both.
The shared runner in `automation/runner.py` (Phase A Task 3) branches on the
result type.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, ClassVar, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.automation.context import MeetingContext
    from app.models import TaskDB


# Phase B Task 5a — locked decisions:
# - Decision 3: ceiling=0 (high-conf) bypasses the envelope; the handler uses
#   the draft-only schema, identical to Phase A. ceiling>0 uses HandlerEnvelope.
# - Question budget per S3 confidence (Flow PDF §3, LOCKED): high→0, mod→1, low→3.
_CONFIDENCE_CEILINGS = {"high": 0, "moderate": 1, "low": 3}


def question_ceiling_for(confidence: str) -> int:
    """Map S3 confidence to the question-budget ceiling for this task."""
    return _CONFIDENCE_CEILINGS.get(confidence, 0)


class Question(BaseModel):
    """One clarifying question. Stable id (`q1`/`q2`/`q3`) lets the answer
    endpoint (Phase B Task 6) key answers back to the question."""
    id: str = Field(description="Stable per-task: q1, q2, q3.")
    text: str = Field(description="The question to ask the user.")
    hint: Optional[str] = Field(default=None, description="Optional hint shown beneath.")


class DraftResult(BaseModel):
    """The handler had enough info — here are the drafted fields."""
    fields: dict


class QuestionsResult(BaseModel):
    """The handler needs more info before it can draft."""
    questions: list[Question] = Field(default_factory=list)


T = TypeVar("T", bound=BaseModel)


class HandlerEnvelope(BaseModel, Generic[T]):
    """Wire shape Gemini returns when ceiling>0 — a discriminated envelope
    expressed via Optional fields (the discriminated-Union form isn't in
    google-genai's structured-output schema subset; confirmed via
    `scripts/smoke_union_schema.py` / `scripts/smoke_envelope_schema.py`).

    The handler's `draft_or_ask_with_schema` caller parameterizes T with the
    per-handler draft schema (e.g. `HandlerEnvelope[GmailDraft]`).
    """
    mode: Literal["draft", "questions"]
    draft: Optional[T] = None
    questions: Optional[list[Question]] = None


class ActionHandler(ABC):
    """One per drafted action shape (gmail, calendar_event, jira, …).

    Subclasses set `handler_name` to the string the router/registry uses
    (e.g. "gmail") and implement `draft_or_ask`.
    """

    handler_name: ClassVar[str]

    @abstractmethod
    def draft_or_ask(
        self,
        task: "TaskDB",
        context: "MeetingContext",
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        """Return draft fields OR clarifying questions.

        Phase A: every handler always returns DraftResult.
        Phase B: low/moderate-confidence tasks may return QuestionsResult
        when the handler decides it lacks enough information to draft well.
        """
        ...
