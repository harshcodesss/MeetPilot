"""Notion documentation draft handler — the richest of the 8.

Drafts a structured multi-section doc: title + sections [{heading, body}].
Routed for `document`-typed tasks.
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


class NotionSection(BaseModel):
    heading: str = Field(description="Short section heading (1–5 words).")
    body: str = Field(description="2–4 sentences for this section.")


class NotionDraft(BaseModel):
    title: str = Field(description="Document title (5–10 words).")
    sections: list[NotionSection] = Field(
        description=(
            "3–4 sections covering: Background, What needs to be done, "
            "Next steps. (Add 'Open questions' as a fourth if any are visible "
            "in the transcript.)"
        ),
    )


NOTION_DRAFT_PROMPT = """\
You are drafting a structured Notion page for a documentation commitment
made in a meeting. The user will review, fill in details, and publish.

This is the richest of the eight draft shapes — multi-section, designed to
become a real internal doc, not a one-liner.

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the documentation commitment:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- title: 5–10 words, captures the doc's subject.
- sections: 3–4 sections, each with a short heading and a 2–4 sentence body.
  Default section order:
    1. "Background"        — what context from the meeting led to this doc.
    2. "What needs to be done" — restate the commitment in detail.
    3. "Next steps"        — concrete first actions.
    4. (optional) "Open questions" — only if questions are visible in the
       transcript; omit otherwise. Do NOT invent open questions to fill space.
- bodies: 2–4 sentences each. No filler like "TBD" / "to be added later".
- Do NOT invent facts, links, owners, or dates not in the task or transcript.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class NotionHandler(ActionHandler):
    handler_name = "notion"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        """Draft the structured Notion doc (title + sections), or ask
        clarifying questions first. The budget follows the task's confidence.
        """
        ceiling = question_ceiling_for(task.confidence)
        prompt = NOTION_DRAFT_PROMPT.format(
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
        return draft_or_ask_with_schema(prompt, NotionDraft, ceiling)
