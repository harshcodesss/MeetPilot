from datetime import datetime

from app.models import SessionDB, SegmentDB


def build_transcript(db_session, session_id: str) -> tuple[str, datetime]:
    """Load a session's segments in (timestamp, seq) order and return a
    speaker-labeled transcript ready for the extraction prompt.

    Returns (labeled_text, started_at). An empty string is returned when the
    session exists but has no segments (e.g. capture started, said nothing,
    stopped). Raises ValueError if the session_id is unknown — that signals a
    caller bug, not a normal empty case.
    """
    session = db_session.get(SessionDB, session_id)
    if session is None:
        raise ValueError(f"session not found: {session_id}")

    segments = (
        db_session.query(SegmentDB)
        .filter(SegmentDB.session_id == session_id)
        .order_by(SegmentDB.timestamp, SegmentDB.seq)
        .all()
    )

    if not segments:
        return "", session.started_at

    lines = [f"[{s.speaker}] {(s.text or '').strip()}" for s in segments]
    return "\n".join(lines).rstrip(), session.started_at
