from abc import ABC, abstractmethod
from datetime import datetime

from .schemas import Task, TaskType, Confidence, Placement


class ExtractionProvider(ABC):
    """Contract the worker depends on. Swap implementations (Gemini, self-hosted, etc.)
    without changing worker code."""

    @abstractmethod
    def extract(self, transcript: str, started_at: datetime) -> list[Task]:
        """Turn a speaker-labeled transcript into a list of validated Task objects.

        `started_at` is the session anchor used to resolve relative deadlines
        (e.g. "by Friday") into absolute dates.
        """


class DummyProvider(ExtractionProvider):
    """Hardcoded provider used to verify the worker → extraction wiring before
    the real Gemini implementation lands. Always returns one fixed task."""

    def extract(self, transcript: str, started_at: datetime) -> list[Task]:
        """Ignore the inputs and return one fixed task, proving the wiring works."""
        return [
            Task(
                assignee="Test User",
                action="Verify the pipeline works",
                type=TaskType.OTHER,
                confidence=Confidence.HIGH,
                placement=Placement.MAIN_LIST,
                source_seq=[],
            )
        ]
