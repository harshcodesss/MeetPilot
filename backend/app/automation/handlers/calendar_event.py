"""Calendar event draft handler — multi-person invite shape.

Drafts title + start/end times + attendees + notes for a meeting-like event.
For solo all-day reminders with no attendees, see calendar_deadline.py.
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


class CalendarEventDraft(BaseModel):
    title: str = Field(description="5–10 word event title.")
    start: Optional[str] = Field(default=None, description="ISO 8601 datetime, or null if unknown.")
    end: Optional[str] = Field(default=None, description="ISO 8601 datetime, or null if unknown.")
    attendees: list[str] = Field(
        default_factory=list,
        description="Names (NOT emails) of attendees, from the transcript or task.",
    )
    notes: str = Field(default="", description="1–2 sentence agenda / context.")


CALENDAR_EVENT_DRAFT_PROMPT = """\
You are drafting a multi-person calendar event for a commitment made in a
meeting. The user will review, fix times and attendee emails themselves,
and confirm.

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the commitment to schedule:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- Title: 5–10 words, captures what the event is for, no "Meeting:" prefix.
- start/end: if `deadline_date` is a real date, propose 10:00–11:00 local
  on that date as ISO 8601. If `deadline_date` is "(none)", leave start
  and end as null — do NOT invent a date.
- attendees: list of NAMES (we don't know emails). Always include the
  meeting owner. Add anyone explicitly named in the transcript who would
  attend. Do NOT invent names; if no other names are clear, attendees may
  contain only the owner.
- notes: 1–2 sentences referencing the commitment from the transcript.
  No boilerplate. No "Looking forward to it!".
- Do NOT invent facts not in the transcript or task.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class CalendarEventHandler(ActionHandler):
    handler_name = "calendar_event"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        ceiling = question_ceiling_for(task.confidence)
        prompt = CALENDAR_EVENT_DRAFT_PROMPT.format(
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
        return draft_or_ask_with_schema(prompt, CalendarEventDraft, ceiling)
