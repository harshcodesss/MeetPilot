import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from .api.answers import router as answers_router
from .api.auth import router as auth_router
from .api.dashboard import router as dashboard_router
from .api.me import router as me_router
from .api.tasks import router as tasks_router
from .auth.dependencies import get_current_user
from .auth.ownership import _require_owned_session
from .database import engine, get_db, Base
from .queue.client import enqueue_extract
from .models import (
    SessionDB,
    SegmentDB,
    SessionStartResponse,
    SegmentsBatchRequest,
    SegmentsBatchResponse,
    SessionCompleteResponse,
    SegmentOut,
    User,
)

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MeetPilot Ingest API", version="0.1.0")

# SessionMiddleware powers Authlib's CSRF-state cookie on the OAuth flow.
# Must be registered before any routers. https_only=False is dev-only.
_auth_session_secret = os.environ.get("AUTH_SESSION_SECRET")
if not _auth_session_secret:
    raise RuntimeError("AUTH_SESSION_SECRET is not set. Add it to backend/.env.")
app.add_middleware(
    SessionMiddleware,
    secret_key=_auth_session_secret,
    same_site="lax",
    https_only=False,
)

# CORS — allow the throwaway dashboard during dev. Covers both localhost and
# 127.0.0.1 loopback names and Vite's port-fallback range (5173 if free,
# 5174/5175 if 5173 is taken). Still no "*"; still allow_credentials=False.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):(5173|5174|5175)",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(answers_router)
app.include_router(tasks_router)
app.include_router(me_router)




@app.post("/session/start", response_model=SessionStartResponse, status_code=201)
def start_session(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new session; returns session_id that the extension stores for the meeting."""
    session = SessionDB(
        user_id=user.user_id,
        started_at=datetime.now(timezone.utc),
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionStartResponse(session_id=session.session_id, started_at=session.started_at)


@app.post("/session/{session_id}/segments", response_model=SegmentsBatchResponse)
def append_segments(
    session_id: str,
    body: SegmentsBatchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Append a batch of finalized caption segments. Idempotent: duplicate seq values are skipped."""
    session = _require_owned_session(session_id, user, db)
    if session.status != "active":
        raise HTTPException(status_code=409, detail="Session is already complete")

    incoming_seqs = [s.seq for s in body.segments]
    existing_seqs = {
        row.seq
        for row in db.query(SegmentDB.seq)
        .filter(SegmentDB.session_id == session_id, SegmentDB.seq.in_(incoming_seqs))
        .all()
    }

    # Meet labels the local participant's caption lines as "You". Substitute the
    # session owner's display name here so the literal "You" never reaches the DB
    # or the extraction prompt. Owner == authed caller (already checked above).
    owner_label = user.display_name or user.email.split("@")[0]

    new_rows = [
        SegmentDB(
            session_id=session_id,
            seq=s.seq,
            speaker=(owner_label if s.speaker.strip().lower() == "you" else s.speaker),
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
def complete_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark a session complete. Idempotent. Enqueues the extraction job (Subsystem 3)."""
    session = _require_owned_session(session_id, user, db)

    if session.status != "complete":
        session.status = "complete"
        db.commit()
        enqueue_extract(session_id)

    return SessionCompleteResponse(session_id=session_id, status=session.status)


# ---------------------------------------------------------------------------
# Debug read endpoint — not part of the production API contract; useful for
# verifying E2E flow without touching SQLite directly. Still auth-gated +
# ownership-checked so it can't leak a stranger's transcript.
# ---------------------------------------------------------------------------

@app.get("/session/{session_id}/segments", response_model=list[SegmentOut])
def read_segments(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return stored segments ordered by (timestamp, seq). Used by the dashboard's transcript view and for ad-hoc debugging."""
    _require_owned_session(session_id, user, db)
    rows = (
        db.query(SegmentDB)
        .filter(SegmentDB.session_id == session_id)
        .order_by(SegmentDB.timestamp, SegmentDB.seq)
        .all()
    )
    return rows
