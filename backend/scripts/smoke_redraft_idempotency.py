"""Phase B Task 7 — re-draft idempotency smoke.

Seeds a task at draft_state='drafted' with a recognizable OLD draft +
prior Q+A, then calls worker.draft_task(task_id) again. Verifies:

  - Exactly one task row for the session (no duplicate insert).
  - draft_state stays 'drafted'.
  - questions + answers UNCHANGED (re-draft must not mutate the inputs).
  - draft is OVERWRITTEN (not merged/appended) — the OLD marker is gone.

This covers the realistic re-draft scenario from the doc (CR-2): the user
edits an answer and re-triggers; state walks `drafted → drafted` with
the draft replaced cleanly.

Cost: 1 Gemini draft call.

Run from backend/:
    ./.venv/bin/python scripts/smoke_redraft_idempotency.py
"""

import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import SegmentDB, SessionDB, TaskDB, User
from app.queue.worker import draft_task

SMOKE_USER_ID = "smoke-redraft-user"
SMOKE_SESSION_ID = "smoke-redraft-session"
SMOKE_TASK_ID = "smoke-redraft-task"

OLD_MARKER = "OLD-MARKER-DO-NOT-USE"
ORIGINAL_DRAFT = {
    "subject": OLD_MARKER,
    "body": "OLD body that the re-draft must replace.",
    "recipient": "",
}
ORIGINAL_QUESTIONS = [
    {"id": "q1", "text": "Which partner are you following up with?", "hint": None},
    {"id": "q2", "text": "What was the topic of last week's discussion?", "hint": None},
]
ORIGINAL_ANSWERS = {"q1": "Acme Corp", "q2": "Q3 contract renewal pricing"}


def _seed(db) -> None:
    db.query(TaskDB).filter(TaskDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SegmentDB).filter(SegmentDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SessionDB).filter(SessionDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(User).filter(User.user_id == SMOKE_USER_ID).delete()
    db.commit()

    db.add(User(
        user_id=SMOKE_USER_ID,
        google_sub="smoke-redraft-sub",
        email="redraft@example.invalid",
        display_name="harsh Rathi",
    ))
    db.add(SessionDB(
        session_id=SMOKE_SESSION_ID,
        user_id=SMOKE_USER_ID,
        started_at=datetime(2026, 5, 28, 11, 30, tzinfo=timezone.utc),
        status="complete",
    ))
    db.add(SegmentDB(
        session_id=SMOKE_SESSION_ID, seq=1, speaker="harsh Rathi",
        text="Follow up with the partner about the contract.",
        timestamp=datetime(2026, 5, 28, 11, 31, tzinfo=timezone.utc),
    ))
    db.add(TaskDB(
        task_id=SMOKE_TASK_ID,
        session_id=SMOKE_SESSION_ID,
        assignee="harsh Rathi",
        action="Follow up with the partner about the thing we discussed",
        type="email",
        confidence="low",
        placement="main_list",
        source_seq=[1],
        # Pre-existing state: already drafted once with the OLD marker draft;
        # prior questions + answers populated from the original Q-loop pass.
        draft_state="drafted",
        handler="gmail",
        questions=list(ORIGINAL_QUESTIONS),
        answers=dict(ORIGINAL_ANSWERS),
        draft=dict(ORIGINAL_DRAFT),
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
    failures = 0
    try:
        _seed(db)
        print(f"seeded task {SMOKE_TASK_ID} at draft_state='drafted' with OLD-MARKER draft")

        # Re-draft (the realistic scenario: user edited answer → re-trigger).
        print("invoking worker.draft_task() on an already-drafted task ...")
        draft_task(SMOKE_TASK_ID)

        db.expire_all()

        # Assertion 1: exactly one task row for this session — no duplicate insert.
        count = db.query(TaskDB).filter(TaskDB.session_id == SMOKE_SESSION_ID).count()
        if count == 1:
            print(f"  ✓ row count: {count} (no duplicate insert)")
        else:
            print(f"  ✗ row count: {count} (expected 1)")
            failures += 1

        task = db.get(TaskDB, SMOKE_TASK_ID)

        # Assertion 2: draft_state stays 'drafted'.
        if task.draft_state == "drafted":
            print(f"  ✓ draft_state: {task.draft_state!r}")
        else:
            print(f"  ✗ draft_state: {task.draft_state!r} (expected 'drafted')")
            failures += 1

        # Assertion 3: questions UNCHANGED.
        if task.questions == ORIGINAL_QUESTIONS:
            print("  ✓ questions unchanged")
        else:
            print(f"  ✗ questions mutated: got {task.questions!r}")
            failures += 1

        # Assertion 4: answers UNCHANGED.
        if task.answers == ORIGINAL_ANSWERS:
            print("  ✓ answers unchanged")
        else:
            print(f"  ✗ answers mutated: got {task.answers!r}")
            failures += 1

        # Assertion 5: draft OVERWRITTEN — OLD marker must be gone.
        new_draft = task.draft or {}
        new_subject = new_draft.get("subject", "")
        new_body = new_draft.get("body", "")
        if OLD_MARKER not in (new_subject + new_body):
            print("  ✓ draft overwritten — OLD marker removed")
            print(f"    new subject: {new_subject!r}")
        else:
            print(f"  ✗ draft NOT overwritten — OLD marker still present: {new_draft!r}")
            failures += 1

        # Assertion 6: handler stays 'gmail'.
        if task.handler == "gmail":
            print(f"  ✓ handler: {task.handler!r}")
        else:
            print(f"  ✗ handler: {task.handler!r} (expected 'gmail')")
            failures += 1

        print()
        if failures == 0:
            print("  ✓ re-draft idempotency verified")
        else:
            print(f"  ✗ {failures} check(s) failed")
        return 0 if failures == 0 else 1
    finally:
        _cleanup(db)
        db.close()


if __name__ == "__main__":
    sys.exit(main())
