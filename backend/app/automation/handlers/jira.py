"""Jira ticket draft handler.

Drafts title + description + assignee + due + type (task / bug / story).
Routed when an `other`-typed task's action contains a jira/ticket/bug keyword.
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


class JiraDraft(BaseModel):
    title: str = Field(description="Verb-noun ticket title (5–10 words).")
    description: str = Field(description="2–3 sentence context from the meeting.")
    assignee: str = Field(description="Name of the assignee; 'unassigned' if not specified.")
    due: Optional[str] = Field(default=None, description="YYYY-MM-DD due date, or null.")
    type: Literal["task", "bug", "story"] = Field(
        default="task",
        description="Issue type: 'bug' if action mentions a defect; 'story' if a feature; else 'task'.",
    )


JIRA_DRAFT_PROMPT = """\
You are drafting a Jira ticket for a commitment made in a meeting. The user
will review, fix the assignee handle and due date, and create the ticket.

================================================================================
INPUTS
================================================================================

Meeting owner: {user_display_name}
Meeting started at: {session_started_at} ({meeting_weekday})

The extracted task — the commitment to ticket:
  Action:        {action}
  Assignee:      {assignee}
  Deadline raw:  {deadline_raw}
  Deadline date: {deadline_date}

Cited transcript lines:
{transcript_excerpt}

================================================================================
RULES
================================================================================

- **Critical: the title and description must describe THE WORK THE TICKET
  TRACKS, never the act of filing/creating the ticket itself.** A ticket
  whose title is "Create a ticket for X" is meta-trash; the title should
  BE about X directly.

  Example transform (the failure mode this rule prevents):
    Source action: "File a Jira ticket for the login redirect bug"
      ✓ title: "Fix login redirect bug"
      ✗ title: "Create Jira ticket for login redirect bug"   (meta — wrong)

    Source action: "Open a ticket to investigate slow checkout"
      ✓ title: "Investigate slow checkout latency"
      ✗ title: "Open ticket: investigate slow checkout"     (meta — wrong)

- title: 5–10 words, imperative verb + noun, describing the WORK.
- description: 2–3 sentences describing the work and the meeting context
  that surfaced it. Do NOT invent reproduction steps, stack traces, or
  PR links.
- assignee: use the task's assignee verbatim (a name, or "unassigned").
- due: copy `deadline_date` if a real date; null otherwise — do not invent.
- type:
    * "bug" if action mentions fix / broken / bug / error / regression /
      crashed.
    * "story" if action describes a new capability / feature.
    * "task" otherwise (default).

{question_rules}
================================================================================
OUTPUT
================================================================================

Return ONLY the JSON object matching the schema.
"""


class JiraHandler(ActionHandler):
    handler_name = "jira"

    def draft_or_ask(
        self,
        task: TaskDB,
        context: MeetingContext,
        answers: Optional[dict[str, str]] = None,
    ) -> DraftResult | QuestionsResult:
        """Draft the Jira ticket fields, or ask clarifying questions first.
        The question budget follows the task's confidence.
        """
        ceiling = question_ceiling_for(task.confidence)
        prompt = JIRA_DRAFT_PROMPT.format(
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
        return draft_or_ask_with_schema(prompt, JiraDraft, ceiling)
