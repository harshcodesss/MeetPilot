"""Session ownership check — shared by main.py and api/dashboard.py."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import SessionDB, User


def _require_owned_session(session_id: str, user: User, db: Session) -> SessionDB:
    """Look up a session and verify the caller owns it.

    Uniform 401/404/403 ladder for every session-touching endpoint:
      - get_current_user already handled 401 by the time we get here.
      - 404 if the session_id is unknown.
      - 403 if the session exists but belongs to a different user.
    """
    session = db.get(SessionDB, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return session
