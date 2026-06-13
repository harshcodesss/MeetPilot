import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, String, Integer, Date, DateTime, ForeignKey, UniqueConstraint, JSON, func
from sqlalchemy.orm import relationship
from pydantic import BaseModel

from .database import Base


# ---------------------------------------------------------------------------
# ORM models — written for Postgres compatibility (String UUIDs, DateTime with
# timezone=True, UniqueConstraint). Switch is a single DATABASE_URL change.
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_sub = Column(String(255), unique=True, nullable=False, index=True)  # identity key — NOT email (emails change)
    email = Column(String(320), nullable=False)
    display_name = Column(String(255), nullable=False)
    picture_url = Column(String(1024), nullable=True)
    # Google OAuth tokens — server-side only, never sent to the extension.
    # Stored as columns (not a separate oauth_credentials table) because v1 has one provider
    # and no rotation-history requirement. Refactor only if a second provider lands.
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    google_token_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("SessionDB", back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    """Opaque bearer-token row for the extension. Distinct from SessionDB (meetings)."""
    __tablename__ = "auth_sessions"

    token = Column(String(64), primary_key=True)  # 32 bytes hex = 64 chars
    user_id = Column(String(36), ForeignKey("users.user_id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="auth_sessions")


class SessionDB(Base):
    __tablename__ = "sessions"

    session_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.user_id"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(16), nullable=False, default="active")  # active | complete
    title = Column(String(255), nullable=True)

    user = relationship("User", back_populates="sessions")
    segments = relationship("SegmentDB", back_populates="session", cascade="all, delete-orphan")


class SegmentDB(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.session_id"), nullable=False)
    seq = Column(Integer, nullable=False)
    speaker = Column(String(255), nullable=False)
    text = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)

    session = relationship("SessionDB", back_populates="segments")

    __table_args__ = (
        UniqueConstraint("session_id", "seq", name="uq_segment_session_seq"),
    )


class TaskDB(Base):
    __tablename__ = "tasks"

    task_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.session_id"), nullable=False, index=True)
    assignee = Column(String, nullable=False)
    action = Column(String, nullable=False)
    deadline_raw = Column(String, nullable=True)
    deadline_date = Column(Date, nullable=True)
    type = Column(String, nullable=False)
    confidence = Column(String, nullable=False)
    placement = Column(String, nullable=False)
    source_seq = Column(JSON, nullable=False)
    # S4 drafting state — additive. draft_state walks extracted → awaiting_answers → answered → drafted.
    # Re-extraction is delete-and-replace by session_id, which wipes these columns along with the row.
    # This is the locked v1 behavior (S4 plan Decision 1 = A); production UI must warn before triggering.
    draft_state = Column(String(32), nullable=False, default="extracted")
    handler = Column(String(64), nullable=True)
    questions = Column(JSON, nullable=True)
    answers = Column(JSON, nullable=True)
    draft = Column(JSON, nullable=True)
    # Frontend Phase 0.1 — completion flag powering the Done column on Tasks
    # board, dimmed-and-sunk state on Meeting Detail, /me/stats "open" counts.
    # NOT a dismissal flag — dismissal is `placement='dismissed'` (Phase 0.3).
    is_done = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ---------------------------------------------------------------------------
# Pydantic schemas — the shared data contract
# ---------------------------------------------------------------------------

class SessionStartResponse(BaseModel):
    session_id: str
    started_at: datetime


class SegmentIn(BaseModel):
    seq: int
    speaker: str
    text: str
    timestamp: datetime


class SegmentsBatchRequest(BaseModel):
    segments: list[SegmentIn]


class SegmentsBatchResponse(BaseModel):
    accepted: int
    skipped: int  # duplicate seq values silently dropped (idempotent retry)


class SessionCompleteResponse(BaseModel):
    session_id: str
    status: str


class SegmentOut(BaseModel):
    seq: int
    speaker: str
    text: str
    timestamp: datetime

    model_config = {"from_attributes": True}
