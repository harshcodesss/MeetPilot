from datetime import date
from enum import Enum

from pydantic import BaseModel


class TaskType(str, Enum):
    EMAIL = "email"
    SCHEDULING = "scheduling"
    DOCUMENT = "document"
    OTHER = "other"


class Confidence(str, Enum):
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class Placement(str, Enum):
    MAIN_LIST = "main_list"
    SUGGESTED = "suggested"


class Task(BaseModel):
    """LLM extraction output for a single commitment. Validated before DB write."""

    assignee: str
    action: str
    deadline_raw: str | None = None
    deadline_date: date | None = None
    type: TaskType
    confidence: Confidence
    placement: Placement
    source_seq: list[int]
