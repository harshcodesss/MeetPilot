import os
from datetime import datetime

from dotenv import load_dotenv
from google import genai

from app.extraction.provider import ExtractionProvider
from app.extraction.prompt import build_prompt
from app.extraction.schemas import Task

# Locked model for MeetPilot extraction. GA, supports structured output,
# stable name (never use *-latest aliases in production code).
GEMINI_MODEL = "gemini-2.5-flash"


class GeminiProvider(ExtractionProvider):
    """Real ExtractionProvider backed by Gemini structured output.

    Validation/retry is deliberately not here — that's Task 11. This layer
    trusts the SDK to constrain output to list[Task] via response_schema.
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
        prompt = build_prompt(transcript, started_at)

        response = self._client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": list[Task],
            },
        )

        return response.parsed
