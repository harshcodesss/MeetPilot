"""Personal to-do draft handler.

Drafts task + priority + due. Default route for `other`-typed tasks that
don't match jira/slack keywords and don't have a non-self named assignee.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.automation.base import (
    ActionHandler,
    DraftResult,
    QuestionsResult,
    question_ceiling_for,
)
from app.automation.context import MeetingContext
from app.automation.llm import draft_or_ask_with_schema, question_rules
from app.models import TaskDB


class TodoDraft(BaseModel):
    task: str = Field(description="Imperative phrasing of the to-do (5–12 words).")
    priority: Literal["high", "medium", "low"] = Field(
        default="medium",
        description="high if the deadline is within 2 days; low if no deadline; medium otherwise.",
    )
    due: Optional[str] = Field(default=None, description="YYYY-MM-DD or null.")


TODO_DRAFT_PROMPT = """\
You are drafting a personal to-do item for a commitment the meeting owner
made to themselves. The user will review and add to their list.

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the personal commitment:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- task: imperative phrasing ("Review the Q3 numbers", not "I should
  review..."). 5–12 words. Drop filler like "make sure to" / "remember to".
- priority:
    * "high" if `deadline_date` is within 2 days of the meeting date.
    * "low" if there is no deadline at all.
    * "medium" otherwise.
- due: copy `deadline_date` if a real date; null otherwise.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class TodoHandler(ActionHandler):
    handler_name = "todo"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        ceiling = question_ceiling_for(task.confidence)
        prompt = TODO_DRAFT_PROMPT.format(
            user_display_name=context.user_display_name,
            session_started_at=context.session_started_at.strftime("%Y-%m-%d %H:%M"),
            meeting_weekday=context.session_started_at.strftime("%A"),
            action=task.action,
            assignee=task.assignee,
            deadline_raw=task.deadline_raw or "(none)",
            deadline_date=task.deadline_date or "(none)",
            transcript_excerpt=context.transcript_excerpt or "(none)",
            question_rules=question_rules(
                ceiling,
                answers is not None,
                prior_questions=task.questions or [],
                answers=answers,
            ),
        )
        return draft_or_ask_with_schema(prompt, TodoDraft, ceiling)
