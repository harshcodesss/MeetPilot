"""Phase B Task 6 — API surface smoke for POST /tasks/{task_id}/answers.

Drives all 5 error paths + the happy path via FastAPI's TestClient. No real
server, no real RQ worker — `enqueue_draft_task` is monkey-patched to a
no-op so the test doesn't require Redis. After the endpoint accepts the
answers, this script calls `worker.draft_task(task_id)` inline to flush
what the queue would have done.

Run from backend/:
    ./.venv/bin/python scripts/smoke_answers_api.py
"""

import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models import AuthSession, SegmentDB, SessionDB, TaskDB, User

# Monkey-patch enqueue_draft_task BEFORE importing the app, so the endpoint
# binds the no-op version (the real one requires a live Redis).
from app.api import answers as answers_mod
_enqueued: list[str] = []
answers_mod.enqueue_draft_task = lambda task_id: _enqueued.append(task_id)

from fastapi.testclient import TestClient
from app.main import app
from app.queue import worker

client = TestClient(app)

# Two users + one session + one task seeded freshly each run.
USER_A_ID = "smoke-api-user-a"
USER_B_ID = "smoke-api-user-b"
SESSION_ID = "smoke-api-session"
TASK_ID = "smoke-api-task"
TOKEN_A = "smoke-api-token-a-" + "0" * 47  # 64 chars
TOKEN_B = "smoke-api-token-b-" + "0" * 47


def _seed(db) -> None:
    """Idempotent: drop prior smoke rows, then insert fresh."""
    db.query(TaskDB).filter(TaskDB.session_id == SESSION_ID).delete()
    db.query(SegmentDB).filter(SegmentDB.session_id == SESSION_ID).delete()
    db.query(SessionDB).filter(SessionDB.session_id == SESSION_ID).delete()
    db.query(AuthSession).filter(AuthSession.user_id.in_([USER_A_ID, USER_B_ID])).delete()
    db.query(User).filter(User.user_id.in_([USER_A_ID, USER_B_ID])).delete()
    db.commit()

    db.add(User(user_id=USER_A_ID, google_sub="smoke-api-sub-a",
                email="a@example.invalid", display_name="harsh Rathi"))
    db.add(User(user_id=USER_B_ID, google_sub="smoke-api-sub-b",
                email="b@example.invalid", display_name="other user"))
    db.add(AuthSession(token=TOKEN_A, user_id=USER_A_ID))
    db.add(AuthSession(token=TOKEN_B, user_id=USER_B_ID))
    db.add(SessionDB(
        session_id=SESSION_ID,
        user_id=USER_A_ID,
        started_at=datetime(2026, 5, 28, 11, 30, tzinfo=timezone.utc),
        status="complete",
    ))
    db.add(SegmentDB(
        session_id=SESSION_ID, seq=1, speaker="harsh Rathi",
        text="Follow up with the partner about the thing we talked about.",
        timestamp=datetime(2026, 5, 28, 11, 31, tzinfo=timezone.utc),
    ))
    db.add(TaskDB(
        task_id=TASK_ID,
        session_id=SESSION_ID,
        assignee="harsh Rathi",
        action="Follow up with the partner about the thing we discussed",
        type="email",
        confidence="low",
        placement="main_list",
        source_seq=[1],
        draft_state="awaiting_answers",
        handler="gmail",
        questions=[
            {"id": "q1", "text": "Which partner?", "hint": None},
            {"id": "q2", "text": "What was discussed?", "hint": None},
        ],
    ))
    db.commit()


def _cleanup(db) -> None:
    db.query(TaskDB).filter(TaskDB.session_id == SESSION_ID).delete()
    db.query(SegmentDB).filter(SegmentDB.session_id == SESSION_ID).delete()
    db.query(SessionDB).filter(SessionDB.session_id == SESSION_ID).delete()
    db.query(AuthSession).filter(AuthSession.user_id.in_([USER_A_ID, USER_B_ID])).delete()
    db.query(User).filter(User.user_id.in_([USER_A_ID, USER_B_ID])).delete()
    db.commit()


def _check(label: str, got: int, expected: int, body: object = None) -> bool:
    ok = got == expected
    mark = "✓" if ok else "✗"
    print(f"  {mark} {label}: got {got}, expected {expected}", end="")
    if not ok and body is not None:
        print(f"  body={body!r}")
    else:
        print()
    return ok


def main() -> int:
    db = SessionLocal()
    _seed(db)
    print(f"seeded user_a={USER_A_ID}, task={TASK_ID} (state=awaiting_answers)")

    headers_a = {"Authorization": f"Bearer {TOKEN_A}"}
    headers_b = {"Authorization": f"Bearer {TOKEN_B}"}
    url = f"/tasks/{TASK_ID}/answers"
    failures = 0

    try:
        print("\n--- Error paths ---")

        # 1. No auth → 401
        r = client.post(url, json={"answers": {"q1": "x"}})
        if not _check("no auth → 401", r.status_code, 401, r.text): failures += 1

        # 2. Cross-user task → 403
        r = client.post(url, json={"answers": {"q1": "x"}}, headers=headers_b)
        if not _check("cross-user → 403", r.status_code, 403, r.text): failures += 1

        # 3. Unknown task id → 404
        r = client.post("/tasks/nonexistent-id/answers",
                        json={"answers": {"q1": "x"}}, headers=headers_a)
        if not _check("unknown task → 404", r.status_code, 404, r.text): failures += 1

        # 5. Unknown question id → 400  (do this BEFORE the happy path so the
        # task is still in awaiting_answers state)
        r = client.post(url, json={"answers": {"qX": "x"}}, headers=headers_a)
        if not _check("unknown question id → 400", r.status_code, 400, r.text): failures += 1

        print("\n--- Happy path ---")

        # 6. Happy path → 202
        r = client.post(url,
                        json={"answers": {"q1": "Acme Corp", "q2": ""}},
                        headers=headers_a)
        if not _check("happy path → 202", r.status_code, 202, r.text): failures += 1
        if r.status_code == 202:
            data = r.json()
            print(f"    response body: {data}")
            print(f"    enqueue_draft_task called with: {_enqueued}")

        # Flush the queue manually (no worker running for this test).
        worker.draft_task(TASK_ID)
        db.expire_all()
        task = db.get(TaskDB, TASK_ID)
        print(f"    post-draft draft_state={task.draft_state!r}, draft.subject={task.draft.get('subject') if task.draft else None!r}")
        if task.draft_state != "drafted":
            print("    ✗ task did not reach drafted")
            failures += 1
        elif not task.draft or "Acme Corp" not in (task.draft.get("subject", "") + task.draft.get("body", "")):
            print("    ✗ draft does not reference the q1 answer 'Acme Corp'")
            failures += 1
        else:
            print("    ✓ draft produced and references q1 answer")

        print("\n--- Already-drafted (state guard on endpoint) ---")

        # 4. Already-drafted task → 409  (state is now 'drafted' from above)
        r = client.post(url, json={"answers": {"q1": "y"}}, headers=headers_a)
        if not _check("already-drafted → 409", r.status_code, 409, r.text): failures += 1

        print("\n" + "=" * 80)
        if failures == 0:
            print(f"  ✓ all 6 checks passed")
        else:
            print(f"  ✗ {failures} check(s) failed")
        return 0 if failures == 0 else 1
    finally:
        _cleanup(db)
        db.close()


if __name__ == "__main__":
    sys.exit(main())
