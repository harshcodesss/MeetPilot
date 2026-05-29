"""Calendar deadline draft handler — solo all-day reminder.

Distinct from calendar_event: this is a personal "remind me by this date"
entry with no attendees and no time-of-day. Routed when the assignee is
the meeting owner and the task is single-source-seq.
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


class CalendarDeadlineDraft(BaseModel):
    title: str = Field(description="Short reminder title (5–10 words).")
    date: Optional[str] = Field(
        default=None,
        description="YYYY-MM-DD date for the all-day reminder, or null if unknown.",
    )
    notes: str = Field(default="", description="1–2 sentence context.")


CALENDAR_DEADLINE_DRAFT_PROMPT = """\
You are drafting a solo all-day calendar reminder for a personal commitment
made in a meeting. No attendees, no time-of-day — just "remind me by this
date".

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the personal commitment to remind about:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- Title: phrased as a reminder ("Send Q3 report to client", not "I will
  send..."). 5–10 words.
- date: use `deadline_date` verbatim if it's a real date. If "(none)",
  leave date as null. Do NOT invent a date.
- notes: 1 sentence linking to the meeting context. No filler.
- No attendees field — this is a solo reminder.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class CalendarDeadlineHandler(ActionHandler):
    handler_name = "calendar_deadline"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        ceiling = question_ceiling_for(task.confidence)
        prompt = CALENDAR_DEADLINE_DRAFT_PROMPT.format(
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
        return draft_or_ask_with_schema(prompt, CalendarDeadlineDraft, ceiling)
