from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from .models import (
    SessionDB,
    SegmentDB,
    SessionStartResponse,
    SegmentsBatchRequest,
    SegmentsBatchResponse,
    SessionCompleteResponse,
    SegmentOut,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MeetPilot Ingest API", version="0.1.0")


@app.post("/session/start", response_model=SessionStartResponse, status_code=201)
def start_session(db: Session = Depends(get_db)):
    """Create a new session; returns session_id that the extension stores for the meeting."""
    session = SessionDB(started_at=datetime.now(timezone.utc), status="active")
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionStartResponse(session_id=session.session_id, started_at=session.started_at)


@app.post("/session/{session_id}/segments", response_model=SegmentsBatchResponse)
def append_segments(
    session_id: str, body: SegmentsBatchRequest, db: Session = Depends(get_db)
):
    """Append a batch of finalized caption segments. Idempotent: duplicate seq values are skipped."""
    session = db.get(SessionDB, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "active":
        raise HTTPException(status_code=409, detail="Session is already complete")

    incoming_seqs = [s.seq for s in body.segments]
    existing_seqs = {
        row.seq
        for row in db.query(SegmentDB.seq)
        .filter(SegmentDB.session_id == session_id, SegmentDB.seq.in_(incoming_seqs))
        .all()
    }

    new_rows = [
        SegmentDB(
            session_id=session_id,
            seq=s.seq,
            speaker=s.speaker,
            text=s.text,
            timestamp=s.timestamp,
        )
        for s in body.segments
        if s.seq not in existing_seqs
    ]

    db.add_all(new_rows)
    db.commit()

    return SegmentsBatchResponse(accepted=len(new_rows), skipped=len(existing_seqs))


@app.post("/session/{session_id}/complete", response_model=SessionCompleteResponse)
def complete_session(session_id: str, db: Session = Depends(get_db)):
    """Mark a session complete. Idempotent. Stubs the extraction job enqueue (Subsystem 3)."""
    session = db.get(SessionDB, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "complete":
        session.status = "complete"
        db.commit()
        # TODO: enqueue RQ extraction job when Subsystem 3 is built
        print(f"[queue stub] session {session_id} complete — extraction job would be enqueued here")

    return SessionCompleteResponse(session_id=session_id, status=session.status)


# ---------------------------------------------------------------------------
# Debug read endpoint — not part of the production API contract; useful for
# verifying E2E flow without touching SQLite directly.
# ---------------------------------------------------------------------------

@app.get("/session/{session_id}/segments", response_model=list[SegmentOut])
def read_segments(session_id: str, db: Session = Depends(get_db)):
    """Return stored segments ordered by (timestamp, seq). Debug use only."""
    session = db.get(SessionDB, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    rows = (
        db.query(SegmentDB)
        .filter(SegmentDB.session_id == session_id)
        .order_by(SegmentDB.timestamp, SegmentDB.seq)
        .all()
    )
    return rows
