import logging
import os
from datetime import datetime

from dotenv import load_dotenv
from google import genai
from pydantic import TypeAdapter, ValidationError

from app.extraction.provider import ExtractionProvider
from app.extraction.prompt import build_prompt
from app.extraction.schemas import Task

logger = logging.getLogger(__name__)

# Locked model for MeetPilot extraction. GA, supports structured output,
# stable name (never use *-latest aliases in production code).
GEMINI_MODEL = "gemini-2.5-flash"

# One TypeAdapter reused across calls — compiling the validator per call is wasted work.
_TASK_LIST_ADAPTER = TypeAdapter(list[Task])


class GeminiProvider(ExtractionProvider):
    """Real ExtractionProvider backed by Gemini structured output.

    Validation+retry policy: Gemini occasionally returns output that fails
    Pydantic validation (malformed JSON, wrong types, missing fields). On the
    first ValidationError we log and retry the exact same call once. A second
    failure propagates so RQ records the job as failed. First-attempt failures
    are always logged even if the retry succeeds, so prompt-misfire frequency
    stays visible (locked decision).
    """

    def __init__(self) -> None:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY is not set. Add it to backend/.env."
            )
        self._client = genai.Client(api_key=api_key)

    def extract(self, transcript: str, started_at: datetime) -> list[Task]:
        """Run extraction on a transcript, retrying once on validation failure."""
        prompt = build_prompt(transcript, started_at)

        try:
            return self._call_and_validate(prompt)
        except ValidationError as first_err:
            logger.warning(
                "Gemini output failed validation on first attempt; retrying once. error=%s",
                first_err,
            )
            return self._call_and_validate(prompt)

    def _call_and_validate(self, prompt: str) -> list[Task]:
        """Make one Gemini structured-output call and validate the response.

        Requests JSON constrained to the Task schema, then validates the raw
        text through the shared TypeAdapter. Raises ValidationError if the
        model's output does not conform; the caller decides whether to retry.
        """
        response = self._client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": list[Task],
            },
        )
        return _TASK_LIST_ADAPTER.validate_json(response.text)
