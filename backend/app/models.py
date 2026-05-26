import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, UniqueConstraint, JSON, func
from sqlalchemy.orm import relationship
from pydantic import BaseModel

from .database import Base


# ---------------------------------------------------------------------------
# ORM models — written for Postgres compatibility (String UUIDs, DateTime with
# timezone=True, UniqueConstraint). Switch is a single DATABASE_URL change.
# ---------------------------------------------------------------------------

class SessionDB(Base):
    __tablename__ = "sessions"

    session_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    started_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(16), nullable=False, default="active")  # active | complete
    title = Column(String(255), nullable=True)

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
