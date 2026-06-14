"""Single per-task drafting code path.

**This is THE drafting function.** Both callers — the end-of-extract loop in
`app/queue/worker.py` (Phase A) and the Phase B `draft_task(task_id)` job —
invoke `draft_one_task` here. Do NOT write a second drafting implementation
later; if Phase B needs different behavior, branch inside this function on
the answers/draft_state shape, not by forking the code path.
"""

import logging
import time
from typing import Optional

from sqlalchemy.orm import Session

from app.automation.base import ActionHandler, DraftResult, QuestionsResult
from app.automation.context import MeetingContext
from app.automation.handlers.asana import AsanaHandler
from app.automation.handlers.calendar_deadline import CalendarDeadlineHandler
from app.automation.handlers.calendar_event import CalendarEventHandler
from app.automation.handlers.gmail import GmailHandler
from app.automation.handlers.jira import JiraHandler
from app.automation.handlers.notion import NotionHandler
from app.automation.handlers.slack import SlackHandler
from app.automation.handlers.todo import TodoHandler
from app.automation.router import route
from app.models import TaskDB, SegmentDB, SessionDB

logger = logging.getLogger(__name__)


# Handler registry: name → singleton instance. The router (Task 2) returns
# the NAME (e.g. "gmail"); this dict resolves it to the running instance.
# Eight entries — full Phase A coverage.
_HANDLERS: dict[str, ActionHandler] = {
    "gmail": GmailHandler(),
    "calendar_event": CalendarEventHandler(),
    "calendar_deadline": CalendarDeadlineHandler(),
    "jira": JiraHandler(),
    "slack": SlackHandler(),
    "todo": TodoHandler(),
    "notion": NotionHandler(),
    "asana": AsanaHandler(),
}


def build_context_for_task(task: TaskDB, db: Session) -> MeetingContext:
    """Per-task MeetingContext: only the segments cited by `task.source_seq`.

    Loading just the cited lines (not the whole transcript) keeps each
    handler's prompt focused on the relevant context and the per-call token
    cost predictable.
    """
    # TaskDB has no `session` relationship defined — look up explicitly.
    session = db.get(SessionDB, task.session_id)
    owner = session.user  # SessionDB → User relationship exists
    seqs = list(task.source_seq or [])
    if seqs:
        segs = (
            db.query(SegmentDB)
            .filter(
                SegmentDB.session_id == session.session_id,
                SegmentDB.seq.in_(seqs),
            )
            .order_by(SegmentDB.timestamp, SegmentDB.seq)
            .all()
        )
        excerpt = "\n".join(
            f"[seq={s.seq}] [{s.speaker}] {s.text}" for s in segs
        )
    else:
        excerpt = ""
    return MeetingContext(
        session_id=session.session_id,
        session_started_at=session.started_at,
        user_display_name=owner.display_name,
        transcript_excerpt=excerpt,
    )


def draft_one_task(
    task: TaskDB,
    context: MeetingContext,
    db: Session,
    answers: Optional[dict[str, str]] = None,
) -> None:
    """Route a task to its handler and persist whatever the handler returns.

    Side effects only — modifies the task row, doesn't commit. Callers
    control transaction boundaries.

    **NO RAISING.** Handler failures (Gemini error, validation error, anything
    else) are logged at WARNING and the row is left at its prior state. One
    task's bad day must not fail the whole drafting pass.
    """
    handler_name = route(task, context)
    if handler_name is None:
        # Manual route — task stays at draft_state='extracted', handler NULL.
        return

    handler = _HANDLERS.get(handler_name)
    if handler is None:
        # All eight router outcomes are registered above; this is a defensive
        # fallback for an unexpected handler name. Treat as a manual route.
        logger.info(
            "handler not registered: task=%s name=%s — skipping",
            task.task_id, handler_name,
        )
        return

    t0 = time.perf_counter()
    try:
        result = handler.draft_or_ask(task, context, answers)
    except Exception as exc:  # noqa: BLE001 — log everything, swallow per design
        logger.warning(
            "handler failed: task=%s handler=%s error=%r",
            task.task_id, handler_name, exc,
        )
        return
    elapsed = time.perf_counter() - t0

    if isinstance(result, DraftResult):
        task.draft = result.fields
        task.handler = handler_name
        task.draft_state = "drafted"
        logger.info(
            "drafted: session=%s task=%s handler=%s elapsed=%.2fs",
            task.session_id, task.task_id, handler_name, elapsed,
        )
    elif isinstance(result, QuestionsResult):
        # Decision 5 (LOCKED): question handling lives in this shared runner,
        # not in either worker caller. First-call → store + flip state. Answer
        # mode → defensive: should never happen (Decision 4's prompt rules
        # forbid it), but if it does, leave the row at 'answered' and log.
        if answers is None:
            task.questions = [q.model_dump() for q in result.questions]
            task.draft_state = "awaiting_answers"
            task.handler = handler_name
            logger.info(
                "awaiting answers: session=%s task=%s handler=%s questions=%d elapsed=%.2fs",
                task.session_id, task.task_id, handler_name,
                len(result.questions), elapsed,
            )
        else:
            logger.warning(
                "handler returned questions despite answers being present — leaving row at prior state: "
                "task=%s handler=%s",
                task.task_id, handler_name,
            )
