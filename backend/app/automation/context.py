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
    """Read-only drafting context for one task.

    ``session_started_at`` is the deadline anchor, ``user_display_name`` lets a
    handler recognize the local participant, and ``transcript_excerpt`` holds
    only the lines the task cites (not the whole meeting). Frozen so a handler
    cannot mutate state shared across the session's tasks.
    """

    session_id: str
    session_started_at: datetime
    user_display_name: str
    transcript_excerpt: str
