"""Dump a session's transcript + extracted tasks to a .txt file at repo root.

Usage (from backend/):
    ./.venv/bin/python scripts/dump_session_report.py <session_id>

Re-runnable. If extraction hasn't run yet, the tasks section shows a placeholder.
"""

import sys
from pathlib import Path

# Allow `import app.*` when running this file directly (script lives in backend/scripts/).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models import SessionDB, SegmentDB, TaskDB


def main(session_id: str) -> None:
    db = SessionLocal()
    try:
        session = db.get(SessionDB, session_id)
        if session is None:
            sys.exit(f"session not found: {session_id}")

        segments = (
            db.query(SegmentDB)
            .filter(SegmentDB.session_id == session_id)
            .order_by(SegmentDB.timestamp, SegmentDB.seq)
            .all()
        )
        tasks = (
            db.query(TaskDB)
            .filter(TaskDB.session_id == session_id)
            .order_by(TaskDB.created_at)
            .all()
        )

        lines = []
        lines.append(f"Session ID: {session_id}")
        lines.append(f"Started at: {session.started_at}")
        lines.append(f"Status:     {session.status}")
        lines.append("")
        lines.append("=" * 80)
        lines.append("TRANSCRIPT")
        lines.append("=" * 80)
        lines.append("")
        if not segments:
            lines.append("(no segments captured)")
        else:
            for s in segments:
                text = (s.text or "").strip()
                lines.append(f"[seq={s.seq}] [{s.speaker}] {text}")
        lines.append("")
        lines.append("=" * 80)
        lines.append(f"EXTRACTED TASKS ({len(tasks)})")
        lines.append("=" * 80)
        lines.append("")
        if not tasks:
            lines.append("(no tasks — extraction has not run yet, or returned zero)")
        else:
            for i, t in enumerate(tasks, 1):
                lines.append(f"Task {i}")
                lines.append(f"  assignee:      {t.assignee}")
                lines.append(f"  action:        {t.action}")
                lines.append(f"  deadline_raw:  {t.deadline_raw}")
                lines.append(f"  deadline_date: {t.deadline_date}")
                lines.append(f"  type:          {t.type}")
                lines.append(f"  confidence:    {t.confidence}")
                lines.append(f"  placement:     {t.placement}")
                lines.append(f"  source_seq:    {t.source_seq}")
                lines.append("")

        # Repo root = backend/.. (this script lives in backend/scripts/)
        repo_root = Path(__file__).resolve().parents[2]
        out = repo_root / f"session_{session_id[:8]}_report.txt"
        out.write_text("\n".join(lines) + "\n")
        print(f"wrote {out}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: dump_session_report.py <session_id>")
    main(sys.argv[1])
