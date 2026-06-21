"""Unit-style checks for build_transcript in extraction/ordering.py.

Uses a throwaway in-memory SQLite database (NOT app.database) so the checks
stay hermetic. They lock the core transcript contract documented in CLAUDE.md:
segments are ordered by (timestamp, seq), seq breaks timestamp ties, each line
is speaker-labeled, and an unknown session_id raises ValueError.

Run from backend/:
    ./.venv/bin/python scripts/check_ordering.py
Exits non-zero if any case fails.
"""

import sys
from datetime import datetime, timedelta, timezone

# Allow running directly from backend/ without installing the app as a package.
sys.path.insert(0, ".")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.extraction.ordering import build_transcript
from app.models import Base, SegmentDB, SessionDB, User

ANCHOR = datetime(2026, 5, 27, 9, 0, tzinfo=timezone.utc)


def _make_db():
    """Fresh in-memory SQLite session with the schema created."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _seed(db, segments):
    """Insert a user, one session, and the given (seq, speaker, text, ts_offset_s)
    segment tuples. Returns the session_id."""
    user = User(user_id="u1", google_sub="sub-1", email="x@y.z", display_name="Harsh")
    session = SessionDB(session_id="s1", user_id="u1", started_at=ANCHOR)
    db.add_all([user, session])
    for seq, speaker, text, offset_s in segments:
        db.add(SegmentDB(
            session_id="s1", seq=seq, speaker=speaker, text=text,
            timestamp=ANCHOR + timedelta(seconds=offset_s),
        ))
    db.commit()
    return "s1"


def check_orders_by_timestamp_then_seq() -> list[str]:
    """Rows inserted out of order come back sorted by (timestamp, seq); seq
    breaks ties between two segments sharing a timestamp."""
    failures = []
    db = _make_db()
    # Insert deliberately scrambled. seq 2 and 3 share offset 10 → seq tie-break.
    session_id = _seed(db, [
        (3, "Priya", "Second at t=10.", 10),
        (1, "Aman", "Earliest.", 0),
        (2, "Aman", "First at t=10.", 10),
        (4, "Priya", "Latest.", 20),
    ])
    text, started_at, count = build_transcript(db, session_id)
    expected = (
        "[seq=1] [Aman] Earliest.\n"
        "[seq=2] [Aman] First at t=10.\n"
        "[seq=3] [Priya] Second at t=10.\n"
        "[seq=4] [Priya] Latest."
    )
    if text != expected:
        failures.append(f"wrong order/format:\n{text!r}\nexpected:\n{expected!r}")
    if count != 4:
        failures.append(f"expected count 4, got {count}")
    # SQLite stores datetimes tz-naive, so compare wall-clock values only.
    if started_at.replace(tzinfo=None) != ANCHOR.replace(tzinfo=None):
        failures.append(f"started_at not passed through: got {started_at!r}")
    return failures


def check_empty_session() -> list[str]:
    """A session with no segments returns an empty string and a zero count."""
    failures = []
    db = _make_db()
    session_id = _seed(db, [])
    text, started_at, count = build_transcript(db, session_id)
    if text != "":
        failures.append(f"expected empty transcript, got {text!r}")
    if count != 0:
        failures.append(f"expected count 0, got {count}")
    # SQLite stores datetimes tz-naive, so compare wall-clock values only.
    if started_at.replace(tzinfo=None) != ANCHOR.replace(tzinfo=None):
        failures.append(f"started_at not passed through on empty session: {started_at!r}")
    return failures


def check_unknown_session_raises() -> list[str]:
    """An unknown session_id is a caller bug → ValueError, not an empty result."""
    failures = []
    db = _make_db()
    try:
        build_transcript(db, "does-not-exist")
        failures.append("expected ValueError for unknown session_id, none raised")
    except ValueError:
        pass
    return failures


def main() -> int:
    checks = [
        ("orders_by_timestamp_then_seq", check_orders_by_timestamp_then_seq),
        ("empty_session", check_empty_session),
        ("unknown_session_raises", check_unknown_session_raises),
    ]

    total_failures: list[str] = []
    for name, check in checks:
        failures = check()
        status = "PASS" if not failures else "FAIL"
        print(f"  [{status}] {name}")
        for failure in failures:
            print(f"         - {failure}")
        total_failures.extend(failures)

    print()
    if total_failures:
        print(f"  {len(total_failures)} failure(s).")
        return 1
    print("  all checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
