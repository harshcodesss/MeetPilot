"""FastAPI dependency for resolving the authenticated user from a bearer token."""

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuthSession, User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Resolve the User from `Authorization: Bearer <token>`.

    401 on any of: missing header, malformed header, unknown token.
    On success, bumps last_used_at on the AuthSession row.
    """
    header = request.headers.get("authorization", "")
    parts = header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = parts[1].strip()
    auth_session = db.get(AuthSession, token)
    if auth_session is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # NOTE: write-on-every-read is a known scaling consideration — under high QPS this contributes
    # to SQLite lock contention. Production would batch the update (e.g. every Nth call) or move
    # auth-session state to Redis. Acceptable for v1 single-user dev.
    auth_session.last_used_at = func.now()
    db.commit()

    return auth_session.user
