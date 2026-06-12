"""Phase B Task 6 — synthetic worker-path smoke test for draft_task().

Inserts a temporary user + session + segment + task (state='answered' with
pre-populated questions and three-way-typed answers), invokes
`worker.draft_task(task_id)` directly, prints the resulting draft, and
deletes the synthetic rows.

No HTTP, no RQ worker process — bypasses both to test the answer-mode
drafting path end-to-end against a real DB. Use this to iterate on prompt
rendering quickly; close the gate with a real meeting capture.

Run from backend/:
    ./.venv/bin/python scripts/smoke_draft_task.py
"""

import json
import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import SegmentDB, SessionDB, TaskDB, User
from app.queue.worker import draft_task

# Deterministic ids so re-runs replace the same rows rather than accreting.
SMOKE_USER_ID = "smoke-user-phase-b-task-6"
SMOKE_SESSION_ID = "smoke-session-phase-b-task-6"
SMOKE_TASK_ID = "smoke-task-phase-b-task-6"


def _seed(db) -> None:
    """Idempotent fixture: drop any prior smoke rows, then insert fresh."""
    db.query(TaskDB).filter(TaskDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SegmentDB).filter(SegmentDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SessionDB).filter(SessionDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(User).filter(User.user_id == SMOKE_USER_ID).delete()
    db.commit()

    db.add(User(
        user_id=SMOKE_USER_ID,
        google_sub="smoke-google-sub-phase-b",
        email="smoke@example.invalid",
        display_name="harsh Rathi",
    ))
    db.add(SessionDB(
        session_id=SMOKE_SESSION_ID,
        user_id=SMOKE_USER_ID,
        started_at=datetime(2026, 5, 28, 11, 30, tzinfo=timezone.utc),
        status="complete",
        title="phase-b-task-6 smoke",
    ))
    db.add(SegmentDB(
        session_id=SMOKE_SESSION_ID,
        seq=1,
        speaker="harsh Rathi",
        text="Oh and I should follow up with the partner about the thing we talked about last week.",
        timestamp=datetime(2026, 5, 28, 11, 31, tzinfo=timezone.utc),
    ))
    # Task is in `answered` state — simulating: handler asked questions
    # (T5), user submitted answers via the endpoint (T6 step 6), endpoint
    # flipped state to `answered` and enqueued this draft_task job.
    db.add(TaskDB(
        task_id=SMOKE_TASK_ID,
        session_id=SMOKE_SESSION_ID,
        assignee="harsh Rathi",
        action="Follow up with the partner about the thing we discussed",
        deadline_raw=None,
        deadline_date=None,
        type="email",
        confidence="low",
        placement="main_list",
        source_seq=[1],
        draft_state="answered",
        handler="gmail",
        questions=[
            {"id": "q1", "text": "Which partner are you following up with?", "hint": None},
            {"id": "q2", "text": "What is the nature of the thing discussed?", "hint": None},
            {"id": "q3", "text": "When should the follow-up go out?", "hint": None},
        ],
        # CR-3 three-way answer states:
        #   q1: substantive
        #   q2: explicit blank → "(blank — user declined)"
        #   q3: missing key   → "(no answer submitted)"
        answers={"q1": "Acme Corp", "q2": ""},
    ))
    db.commit()


def _cleanup(db) -> None:
    db.query(TaskDB).filter(TaskDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SegmentDB).filter(SegmentDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SessionDB).filter(SessionDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(User).filter(User.user_id == SMOKE_USER_ID).delete()
    db.commit()


def main() -> int:
    db = SessionLocal()
    try:
        _seed(db)
        print(f"seeded task {SMOKE_TASK_ID} at draft_state='answered'")

        print("invoking worker.draft_task() directly ...")
        draft_task(SMOKE_TASK_ID)

        # Re-fetch to see the post-draft state.
        task = db.get(TaskDB, SMOKE_TASK_ID)
        if task is None:
            print("[FAIL] task vanished after draft_task")
            return 1
        # Refresh to invalidate any cached column values from before draft_task.
        db.refresh(task)

        print()
        print("=" * 80)
        print(f"  draft_state = {task.draft_state!r}")
        print(f"  handler     = {task.handler!r}")
        print("  draft:")
        print(json.dumps(task.draft, indent=2, default=str))
        print("=" * 80)

        if task.draft_state == "drafted" and task.draft:
            print("✓ draft_task end-to-end OK")
            return 0
        print("✗ draft_task did NOT produce a drafted task")
        return 1
    finally:
        _cleanup(db)
        db.close()


if __name__ == "__main__":
    sys.exit(main())
