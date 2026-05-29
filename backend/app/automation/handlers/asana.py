"""Asana team-task draft handler.

Drafts task + assignee + due. Routed when an `other`-typed task has a
named non-self assignee and doesn't match jira/slack keywords.
"""

from __future__ import annotations

from typing import Optional

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


class AsanaDraft(BaseModel):
    task: str = Field(description="Imperative task (5–12 words).")
    assignee: str = Field(description="Name of the assignee (a teammate, not the meeting owner).")
    due: Optional[str] = Field(default=None, description="YYYY-MM-DD or null.")


ASANA_DRAFT_PROMPT = """\
You are drafting an Asana task for a teammate, based on a commitment made
in a meeting. The user (the meeting owner) will review, pick the right
Asana project, and create the task.

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the team commitment:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- task: imperative phrasing aimed at the assignee ("Review Q3 analytics
  dashboard", not "Priya will review..."). 5–12 words.
- assignee: copy the task's assignee verbatim. It should be a teammate's
  name, NOT the meeting owner ({user_display_name}) — if it is, the wrong
  handler was picked; still draft, but flag with a note in the task field.
- due: copy `deadline_date` if real; null otherwise.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class AsanaHandler(ActionHandler):
    handler_name = "asana"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        ceiling = question_ceiling_for(task.confidence)
        prompt = ASANA_DRAFT_PROMPT.format(
            user_display_name=context.user_display_name,
            session_started_at=context.session_started_at.strftime("%Y-%m-%d %H:%M"),
            meeting_weekday=context.session_started_at.strftime("%A"),
            action=task.action,
            assignee=task.assignee,
            deadline_raw=task.deadline_raw or "(none)",
            deadline_date=task.deadline_date or "(none)",
            transcript_excerpt=context.transcript_excerpt or "(none)",
            question_rules=question_rules(ceiling, answers is not None),
        )
        return draft_or_ask_with_schema(prompt, AsanaDraft, ceiling)
