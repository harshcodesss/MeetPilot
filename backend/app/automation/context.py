"""Minimal data carrier passed to every handler. Built once per session by the
worker after extraction completes, then passed by reference to each per-task
drafting call.

Kept deliberately small — handlers need the meeting anchor and the local
participant's name to draft sensibly, plus only the transcript lines the
extracted task actually cites (via `source_seq`), NOT the full transcript.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class MeetingContext:
    session_id: str
    session_started_at: datetime
    user_display_name: str
    transcript_excerpt: str
