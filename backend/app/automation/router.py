"""Deterministic 4-to-8 routing — picks one of eight handler names (or None
for the manual route), based only on S3's `type` field plus simple
heuristics on `action` text and assignee. No LLM call.

# v1 routing is deliberately cheap and brittle, not robust.

This is the right shape of router for the v1 budget, not for production.
Documented brittlenesses (per docs/Subsystem4_Task_Plan.md, Underspecified
item 1):

  - Mixed-signal tasks WILL misroute. "Slack the team about the Jira bug"
    lands at slack — the slack-keyword check fires before the jira-keyword
    check. Any task naming multiple tools in one sentence has this risk.
  - The order of keyword checks is itself a brittle commitment. Re-ordering
    later silently re-routes prior tasks if they're re-extracted.
  - Edge categories collapse to defaults. Anything in the `other` branch
    not matching a keyword falls to `todo`; `asana`/`jira`/`slack` fire
    only on confident keyword matches.

Upgrade path is option (ii) — a small LLM sub-router seeing the task plus
all 8 handler descriptions and returning one name. Intentionally deferred
to v1+1, not "maybe later".
"""

import logging
from typing import Optional

from app.automation.context import MeetingContext
from app.models import TaskDB

logger = logging.getLogger(__name__)


# Keyword cues are checked in this order; first match wins.
_JIRA_KEYWORDS = ("jira", "ticket", "bug")
_SLACK_KEYWORDS = ("slack", "channel", "dm ")


def _is_self_assignee(assignee: str, display_name: str) -> bool:
    """Return True if `assignee` refers to the meeting owner.

    Case-insensitive comparison: Gemini occasionally re-capitalises the speaker
    name ("Harsh Rathi" vs "harsh Rathi"); ingest stores display_name verbatim.
    Strip + lower on both sides avoids false misroutes from capitalisation drift.
    """
    return (assignee or "").strip().lower() == (display_name or "").strip().lower()


def route(task: TaskDB, context: MeetingContext) -> Optional[str]:
    """Return the chosen handler's `handler_name`, or None for the manual route.

    Returns a STRING (the handler name) rather than a handler instance —
    instance lookup is the next layer's job (added in Phase A Task 3 when
    handler classes exist). This split lets Task 2 ship and verify the
    routing decision in isolation, with no forward dependency on handlers.
    """
    task_type = task.type
    action_lc = (task.action or "").lower()
    assignee = task.assignee or ""

    if task_type == "email":
        return "gmail"

    if task_type == "document":
        return "notion"

    if task_type == "scheduling":
        # Self + single-seq = personal deadline, no attendees → calendar_deadline.
        # Anything else (multi-speaker contribution or non-self assignee) →
        # calendar_event (multi-person invite shape).
        if _is_self_assignee(assignee, context.user_display_name) and len(task.source_seq or []) == 1:
            return "calendar_deadline"
        return "calendar_event"

    if task_type == "other":
        # Keyword cues, first-match-wins (see module docstring re: brittleness).
        # Order locked per docs/Subsystem4_Task_Plan.md, Underspecified item 1:
        # slack-keyword check fires BEFORE jira-keyword check, so mixed-signal
        # tasks like "Slack the team about the Jira bug" land at Slack.
        if any(kw in action_lc for kw in _SLACK_KEYWORDS):
            return "slack"
        if any(kw in action_lc for kw in _JIRA_KEYWORDS):
            return "jira"
        # Named other-person assignee → team task → asana.
        if assignee.lower() not in ("unassigned", "") and not _is_self_assignee(assignee, context.user_display_name):
            return "asana"
        # Default: personal item.
        return "todo"

    # Unknown / future type value → manual route. Logged so a growing tail of
    # manual-route tasks is visible without scraping the DB.
    logger.info("no handler match: task=%s type=%s", task.task_id, task_type)
    return None
