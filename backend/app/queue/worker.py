# Start the worker from backend/:
#   ./.venv/bin/rq worker -w rq.SimpleWorker -u redis://localhost:6379/0 default
#
# Why SimpleWorker: macOS + Python + fork() crashes when imported libraries
# touched the Objective-C runtime (httpx/ssl/etc., pulled in by google-genai).
# SimpleWorker runs jobs inline instead of fork()-ing a child, sidestepping
# the crash entirely. For Linux/prod, drop `-w rq.SimpleWorker` to get the
# default forking worker (job-level isolation).

from app.database import SessionLocal
from app.models import TaskDB

from app.extraction.ordering import build_transcript
from app.extraction.gemini import GeminiProvider

# Below this many non-whitespace words the transcript is effectively empty
# ("started capture, said nothing, stopped"). Skip the Gemini call entirely
# rather than spending an API request on noise.
MIN_TRANSCRIPT_WORDS = 5


def extract(session_id):
    print(f"[worker] extracting session {session_id}")

    db = SessionLocal()
    try:
        transcript, started_at = build_transcript(db, session_id)

        word_count = len(transcript.split())
        if word_count < MIN_TRANSCRIPT_WORDS:
            print(
                f"[worker] session {session_id} skipped — "
                f"transcript too short ({word_count} words, min {MIN_TRANSCRIPT_WORDS})"
            )
            return

        tasks = GeminiProvider().extract(transcript, started_at)

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
            print(f"[worker] replaced {deleted} prior task(s) for session {session_id}")

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
        print(f"[worker] inserted {len(tasks)} task(s) for session {session_id}")
    finally:
        db.close()
