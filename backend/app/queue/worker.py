from app.database import SessionLocal
from app.models import TaskDB


def extract(session_id):
    print(f"[worker] extracting session {session_id}")

    db = SessionLocal()
    try:
        task = TaskDB(
            session_id=session_id,
            assignee="Test User",
            action="Verify the pipeline works",
            type="other",
            confidence="high",
            placement="main_list",
            source_seq=[],
        )
        db.add(task)
        db.commit()
        print(f"[worker] created task {task.task_id} for session {session_id}")
    finally:
        db.close()
