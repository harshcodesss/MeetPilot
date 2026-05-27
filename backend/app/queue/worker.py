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

logger = logging.getLogger(__name__)

# Below this many non-whitespace words the transcript is effectively empty
# ("started capture, said nothing, stopped"). Skip the Gemini call entirely
# rather than spending an API request on noise.
MIN_TRANSCRIPT_WORDS = 5


def extract(session_id):
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
    finally:
        db.close()
