"""Slack message draft handler.

Drafts channel + message text. Routed when an `other`-typed task's action
contains slack/channel/dm keywords.
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


class SlackDraft(BaseModel):
    channel: str = Field(
        description="#channel-name (default '#general' if no specific channel is named).",
    )
    message: str = Field(description="1–2 sentence Slack-style notification.")


SLACK_DRAFT_PROMPT = """\
You are drafting a Slack message for a commitment made in a meeting. The
user will pick the channel themselves if needed and post it.

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the commitment to message about:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- **Critical: the `message` field is the ACTUAL CONTENT TO POST in Slack,
  NOT a description of the act of posting.** A message that says "X will
  post in #ops when Y happens" is meta-trash — the user wants the message
  they would copy-paste into Slack, written from their voice.

  Example transform (the failure mode this rule prevents):
    Source action: "Post in #ops when the deploy is done"
      ✓ message: "Deploy is complete. Service is back up."
      ✗ message: "harsh Rathi will post in #ops when the deploy is done"
        (meta — describes the commitment, not the message itself)

    Source action: "Let the team know in slack that Q3 launch is approved"
      ✓ message: "Heads up: Q3 launch is approved. Kicking off this week."
      ✗ message: "I will let the team know that Q3 launch is approved"
        (meta — wrong)

- channel: if the transcript names a specific channel (e.g. "#ops",
  "#announcements"), use it. Otherwise default to "#general".
- message: the post itself, 1–2 sentences max, written in first person
  from the meeting owner's voice. Slack-style: terse, no email-style
  greeting, no signature. Do NOT invent links or details not in the task.
- Do NOT @-mention names that weren't in the transcript or task.

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class SlackHandler(ActionHandler):
    handler_name = "slack"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        ceiling = question_ceiling_for(task.confidence)
        prompt = SLACK_DRAFT_PROMPT.format(
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
        return draft_or_ask_with_schema(prompt, SlackDraft, ceiling)
