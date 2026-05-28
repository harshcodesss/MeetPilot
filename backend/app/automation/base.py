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
from typing import TYPE_CHECKING, ClassVar, Optional

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.automation.context import MeetingContext
    from app.models import TaskDB


class DraftResult(BaseModel):
    """The handler had enough info — here are the drafted fields."""
    fields: dict


class QuestionsResult(BaseModel):
    """The handler needs more info before it can draft.

    Each question is a dict with stable keys: {"id": str, "text": str,
    "hint": str | None}. Ids are stable WITHIN the task so the answer
    endpoint (Phase B Task 6) can key answers back to questions.
    """
    questions: list[dict] = Field(default_factory=list)


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
