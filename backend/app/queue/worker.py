# Start the worker from backend/:
#   ./.venv/bin/rq worker -w rq.SimpleWorker -u redis://localhost:6379/0 default
#
# Why SimpleWorker: macOS + Python + fork() crashes when imported libraries
# touched the Objective-C runtime (httpx/ssl/etc., pulled in by google-genai).
# SimpleWorker runs jobs inline instead of fork()-ing a child, sidestepping
# the crash entirely. For Linux/prod, drop `-w rq.SimpleWorker` to get the
# default forking worker (job-level isolation).

import logging
import time

from app.database import SessionLocal
from app.models import TaskDB

from app.extraction.ordering import build_transcript
from app.extraction.gemini import GeminiProvider
from app.automation.runner import build_context_for_task, draft_one_task

logger = logging.getLogger(__name__)

# Below this many non-whitespace words the transcript is effectively empty
# ("started capture, said nothing, stopped"). Skip the Gemini call entirely
# rather than spending an API request on noise.
MIN_TRANSCRIPT_WORDS = 5


def extract(session_id):
    """Worker job: turn a completed session's transcript into drafted tasks.

    Builds the ordered transcript, runs LLM extraction (skipping
    near-empty transcripts), replaces any prior tasks for the session
    (delete-and-replace idempotency), then runs the S4 drafting pass
    over the fresh tasks.
    """
    db = SessionLocal()
    try:
        transcript, started_at, segment_count = build_transcript(db, session_id)
        word_count = len(transcript.split())

        logger.info(
            "extraction start: session=%s segments=%d chars=%d words=%d",
            session_id, segment_count, len(transcript), word_count,
        )

        if word_count < MIN_TRANSCRIPT_WORDS:
            logger.info(
                "extraction skipped: session=%s transcript too short (words=%d, min=%d)",
                session_id, word_count, MIN_TRANSCRIPT_WORDS,
            )
            return

        t0 = time.perf_counter()
        try:
            tasks = GeminiProvider().extract(transcript, started_at)
        except Exception as exc:
            elapsed = time.perf_counter() - t0
            logger.error(
                "extraction failed: session=%s elapsed=%.2fs error=%r",
                session_id, elapsed, exc,
            )
            raise
        elapsed = time.perf_counter() - t0
        logger.info(
            "gemini call ok: session=%s tasks=%d elapsed=%.2fs",
            session_id, len(tasks), elapsed,
        )

        # Delete-and-replace idempotency (locked decision): wipe any existing
        # tasks for this session before inserting the fresh extraction. Both
        # operations run inside one transaction — if the insert phase fails,
        # the delete is rolled back too and prior state survives.
        deleted = (
            db.query(TaskDB)
            .filter(TaskDB.session_id == session_id)
            .delete(synchronize_session=False)
        )
        if deleted:
            logger.info(
                "replaced prior tasks: session=%s count=%d", session_id, deleted,
            )

        for t in tasks:
            db.add(TaskDB(
                session_id=session_id,
                assignee=t.assignee,
                action=t.action,
                deadline_raw=t.deadline_raw,
                deadline_date=t.deadline_date,
                type=t.type.value,
                confidence=t.confidence.value,
                placement=t.placement.value,
                source_seq=t.source_seq,
            ))
        db.commit()
        logger.info(
            "extraction complete: session=%s inserted=%d", session_id, len(tasks),
        )

        # ----- S4 Phase A drafting pass -----------------------------------
        # Route each just-inserted task to its handler and draft inline.
        # `draft_one_task` swallows per-task handler failures internally —
        # one bad draft must not fail the whole drafting pass. The same
        # function is reused by Phase B's draft_task(task_id) job (single
        # drafting code path, locked by the plan).
        tasks_to_draft = (
            db.query(TaskDB)
            .filter(TaskDB.session_id == session_id)
            .order_by(TaskDB.created_at)
            .all()
        )
        for task in tasks_to_draft:
            context = build_context_for_task(task, db)
            draft_one_task(task, context, db, answers=None)
        db.commit()
        drafted_count = sum(1 for t in tasks_to_draft if t.draft_state == "drafted")
        logger.info(
            "drafting pass complete: session=%s tasks_examined=%d drafted=%d",
            session_id, len(tasks_to_draft), drafted_count,
        )
    finally:
        db.close()


# Phase B Task 6: answer-submission worker job. Thin shell over the shared
# `draft_one_task` — single drafting code path for both callers (the
# end-of-extract loop above + this answer-resolution path).
#
# Triggered by `POST /tasks/{task_id}/answers` via `enqueue_draft_task`. By
# the time we get here, the API has persisted `task.answers` and flipped
# `draft_state` → "answered" (Decision 7: persist BEFORE enqueue, so on
# Redis/enqueue failure the data is safe and an admin can manually
# re-enqueue this job).
_VALID_DRAFT_TASK_STATES = {"answered", "drafted"}


def draft_task(task_id):
    """Worker job: re-draft a single task after the user submits answers.

    Guards on draft_state ("answered" or "drafted" only) so a stale or
    premature retry can't produce a junk draft, then delegates to the
    shared draft_one_task path with the persisted answers.
    """
    db = SessionLocal()
    try:
        task = db.get(TaskDB, task_id)
        if task is None:
            logger.warning("draft_task: task not found, task=%s", task_id)
            return

        # Defensive state guard. Valid entry states:
        #   - "answered": the normal first-time draft after answer submission.
        #   - "drafted": a re-draft (e.g. user edited their answer and
        #     re-triggered); draft_one_task overwrites cleanly.
        # If we land here on "awaiting_answers" we are EITHER stuck from the
        # Decision-7 failure mode (persist failed but enqueue fired) OR
        # racing a stale retry from before the persist landed. Either way,
        # drafting now would call the handler with the original first-call
        # rules (answers=None route) and produce a junk draft — log and bail.
        # Same goes for "extracted" — that path is owned by the end-of-extract
        # loop, not by draft_task.
        if task.draft_state not in _VALID_DRAFT_TASK_STATES:
            logger.warning(
                "draft_task skipped: task=%s state=%s — expected one of %s",
                task_id, task.draft_state, sorted(_VALID_DRAFT_TASK_STATES),
            )
            return

        context = build_context_for_task(task, db)
        draft_one_task(task, context, db, answers=task.answers)
        db.commit()
        logger.info(
            "draft_task complete: task=%s draft_state=%s handler=%s",
            task_id, task.draft_state, task.handler,
        )
    finally:
        db.close()
