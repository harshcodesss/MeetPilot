"""Gmail draft handler. Drafts subject + body from the meeting context;
the recipient is always blank (locked by CLAUDE.md — never guess email
addresses).
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


class GmailDraft(BaseModel):
    """Wire shape Gemini is constrained to produce."""
    subject: str = Field(description="5–10 word subject line. No 'Re:'/'Fwd:'.")
    body: str = Field(description="2–4 sentences. No salutation that guesses a name.")
    recipient: str = Field(default="", description="ALWAYS empty in v1.")


GMAIL_DRAFT_PROMPT = """\
You are drafting a follow-up email for a commitment made in a meeting.
The user will review the draft, fill in the recipient themselves, edit if
needed, and click send. Your job is to make the subject and body so good
they want to send it as-is.

================================================================================
INPUTS
================================================================================

Meeting owner (the person whose dashboard this email will appear on):
  {user_display_name}

Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the commitment the meeting decided someone needs to do:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines — the segments that produced this task:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- The `recipient` field MUST be empty. Do NOT guess an email address; the
  user will fill it in.
- Subject: 5–10 words, informative, NO leading "Re:" or "Fwd:", no
  timestamps, no signatures, no email-address-looking strings.
- Body: 2–4 sentences, direct, references the meeting commitment, no
  hallucinated names. Use a generic "Hi," — NEVER "Hi <Name>,".
- Perspective: if the assignee is the meeting owner ({user_display_name}),
  write from THEIR perspective ("I'll send the report..."). Otherwise
  frame as a follow-up FROM the meeting owner ("Following up on the
  meeting, here's the report you needed...").
- If a `deadline_date` is given, reference it naturally (e.g. "by Friday"
  or "by 2026-05-29"). If it is "(none)", do NOT invent one.
- Do NOT invent context not in the transcript or task. If you don't know
  who the email goes to, that's fine — the user will add the recipient.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema. No prose, no markdown fences.
"""


class GmailHandler(ActionHandler):
    handler_name = "gmail"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        """Draft the email subject/body, or ask clarifying questions first.

        Whatever Gemini returns, the recipient is forced blank before the
        draft is handed back — never guess an address (locked by CLAUDE.md).
        """
        ceiling = question_ceiling_for(task.confidence)
        is_answer_mode = answers is not None
        prompt = GMAIL_DRAFT_PROMPT.format(
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
                is_answer_mode,
                prior_questions=task.questions or [],
                answers=answers,
            ),
        )
        result = draft_or_ask_with_schema(prompt, GmailDraft, ceiling)
        if isinstance(result, DraftResult):
            # Locked by CLAUDE.md — recipient stays blank in v1, full stop.
            result.fields["recipient"] = ""
        return result
