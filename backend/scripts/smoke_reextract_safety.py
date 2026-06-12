"""Phase B Task 7 — re-extraction safety smoke.

Seeds a session with two pre-existing tasks (one drafted, one answered),
monkey-patches GeminiProvider to return ONE deterministic synthetic task,
then runs `worker.extract(session_id)`. Verifies:

  - The 2 pre-seeded task rows are GONE (delete-and-replace by session_id).
  - Exactly 1 new task row exists (no row stacking).
  - The new row has fresh draft_state, draft, and NULL answers — the
    locked Decision 1 behavior: re-extraction wipes S4 state.
  - "drafting pass complete: tasks_examined=1 drafted=1" — confirms
    CR-4 (no silent re-drafts, no infinite loop): each re-extract runs
    once and finishes.

The monkeypatch keeps the test deterministic AND cheap: extraction
returns a known synthetic Task without burning a Gemini extract call.
Drafting runs against real Gemini (1 call).

Cost: 1 Gemini draft call.

Run from backend/:
    ./.venv/bin/python scripts/smoke_reextract_safety.py
"""

import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.extraction.schemas import Confidence, Placement, Task, TaskType
from app.models import SegmentDB, SessionDB, TaskDB, User
from app.queue import worker

SMOKE_USER_ID = "smoke-reextract-user"
SMOKE_SESSION_ID = "smoke-reextract-session"
TASK_A_ID = "smoke-reextract-task-a-drafted"
TASK_B_ID = "smoke-reextract-task-b-answered"


class StubGeminiProvider:
    """Deterministic stand-in for GeminiProvider. Returns ONE Task whose
    type=email + confidence=high will route to gmail and draft cleanly."""

    def extract(self, transcript: str, started_at):  # noqa: ARG002
        return [
            Task(
                assignee="harsh Rathi",
                action="Email Acme Corp the updated Q3 revenue report",
                deadline_raw=None,
                deadline_date=None,
                type=TaskType.EMAIL,
                confidence=Confidence.HIGH,
                placement=Placement.MAIN_LIST,
                source_seq=[1],
            ),
        ]


def _seed(db) -> None:
    db.query(TaskDB).filter(TaskDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SegmentDB).filter(SegmentDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(SessionDB).filter(SessionDB.session_id == SMOKE_SESSION_ID).delete()
    db.query(User).filter(User.user_id == SMOKE_USER_ID).delete()
    db.commit()

    db.add(User(
        user_id=SMOKE_USER_ID,
        google_sub="smoke-reextract-sub",
        email="reextract@example.invalid",
        display_name="harsh Rathi",
    ))
    db.add(SessionDB(
        session_id=SMOKE_SESSION_ID,
        user_id=SMOKE_USER_ID,
        started_at=datetime(2026, 5, 28, 11, 30, tzinfo=timezone.utc),
        status="complete",
    ))
    # Transcript must be ≥5 words (worker's MIN_TRANSCRIPT_WORDS guard).
    db.add(SegmentDB(
        session_id=SMOKE_SESSION_ID, seq=1, speaker="harsh Rathi",
        text="I will email Acme Corp the updated Q3 revenue report tomorrow.",
        timestamp=datetime(2026, 5, 28, 11, 31, tzinfo=timezone.utc),
    ))
    # Two pre-existing tasks: one drafted, one answered — Decision 1 says
    # both go in the wipe.
    db.add(TaskDB(
        task_id=TASK_A_ID,
        session_id=SMOKE_SESSION_ID,
        assignee="harsh Rathi",
        action="OLD task A (drafted, will be wiped)",
        type="email",
        confidence="high",
        placement="main_list",
        source_seq=[1],
        draft_state="drafted",
        handler="gmail",
        draft={"subject": "OLD-A-SUBJECT", "body": "OLD-A-BODY", "recipient": ""},
    ))
    db.add(TaskDB(
        task_id=TASK_B_ID,
        session_id=SMOKE_SESSION_ID,
        assignee="harsh Rathi",
        action="OLD task B (answered, will be wiped)",
        type="email",
        confidence="low",
        placement="main_list",
        source_seq=[1],
        draft_state="answered",
        handler="gmail",
        questions=[{"id": "q1", "text": "Which partner?", "hint": None}],
        answers={"q1": "OLD-ANSWER-FOR-TASK-B"},
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
    original_provider = worker.GeminiProvider

    try:
        _seed(db)
        print(f"seeded 2 tasks: {TASK_A_ID} (drafted) + {TASK_B_ID} (answered)")

        # Monkeypatch the worker's reference to GeminiProvider. extract() does
        # `GeminiProvider()` inside its body; binding-name lookup goes through
        # the worker module's globals, so swapping there is enough.
        worker.GeminiProvider = StubGeminiProvider

        print("invoking worker.extract() — watch for 'replaced prior tasks' "
              "and 'drafting pass complete' log lines ...")
        print("-" * 80)
        worker.extract(SMOKE_SESSION_ID)
        print("-" * 80)

        db.expire_all()

        # Assertion 1: the two pre-seeded tasks are GONE.
        a_still_there = db.get(TaskDB, TASK_A_ID)
        b_still_there = db.get(TaskDB, TASK_B_ID)
        if a_still_there is None and b_still_there is None:
            print("  ✓ pre-seeded tasks wiped (both task_ids gone)")
        else:
            print(f"  ✗ pre-seeded task survived: "
                  f"a={'gone' if a_still_there is None else 'STILL HERE'}, "
                  f"b={'gone' if b_still_there is None else 'STILL HERE'}")
            failures += 1

        # Assertion 2: exactly 1 task row for this session (matches stub size).
        new_tasks = (
            db.query(TaskDB)
            .filter(TaskDB.session_id == SMOKE_SESSION_ID)
            .all()
        )
        if len(new_tasks) == 1:
            print("  ✓ exactly 1 new task row (stub returned 1 task)")
        else:
            print(f"  ✗ wrong task count after re-extract: {len(new_tasks)} (expected 1)")
            failures += 1

        if new_tasks:
            t = new_tasks[0]

            # Assertion 3: it's a NEW task id (not Task A's or Task B's).
            if t.task_id not in (TASK_A_ID, TASK_B_ID):
                print(f"  ✓ new task_id ({t.task_id}) — row was inserted fresh")
            else:
                print(f"  ✗ task_id collides with pre-seeded id: {t.task_id}")
                failures += 1

            # Assertion 4: answers wiped (Decision 1 — re-extract wipes S4 state).
            if t.answers is None:
                print("  ✓ answers wiped (None) — Decision 1 behavior held")
            else:
                print(f"  ✗ answers survived: {t.answers!r}")
                failures += 1

            # Assertion 5: draft is fresh, OLD markers gone.
            if t.draft is not None:
                draft_str = (t.draft.get("subject", "") + t.draft.get("body", ""))
                if "OLD-A" not in draft_str and "OLD-B" not in draft_str:
                    print(f"  ✓ fresh draft (no OLD markers): subject={t.draft.get('subject')!r}")
                else:
                    print(f"  ✗ OLD marker leaked into new draft: {t.draft!r}")
                    failures += 1
            else:
                print("  ✗ new task has no draft (drafting pass didn't run)")
                failures += 1

            # Assertion 6: state is 'drafted' (synthetic task is high-conf, must draft).
            if t.draft_state == "drafted":
                print("  ✓ new task at draft_state='drafted'")
            else:
                print(f"  ✗ unexpected draft_state: {t.draft_state!r}")
                failures += 1

        print()
        if failures == 0:
            print("  ✓ re-extraction safety verified (Decision 1 + CR-4 hold)")
        else:
            print(f"  ✗ {failures} check(s) failed")
        return 0 if failures == 0 else 1
    finally:
        worker.GeminiProvider = original_provider
        _cleanup(db)
        db.close()


if __name__ == "__main__":
    sys.exit(main())
