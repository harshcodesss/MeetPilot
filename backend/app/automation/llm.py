"""Shared low-level Gemini caller for handlers. Built once in Phase A Task 3
so Task 4's seven handlers don't reshape it.

Mirrors the GeminiProvider pattern from app/extraction/gemini.py — env loading
and client construction are lazy (first call), so importing this module has
no side effects.
"""

import os
from typing import TypeVar

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

GEMINI_MODEL = "gemini-3.1-flash-lite"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set. Add it to backend/.env.")
        _client = genai.Client(api_key=api_key)
    return _client


T = TypeVar("T", bound=BaseModel)


def draft_with_schema(prompt: str, schema: type[T]) -> T:
    """Call Gemini in structured-output mode; return a validated instance of `schema`.

    Thin wrapper. Validation lives in `schema.model_validate_json` — failures
    raise `pydantic.ValidationError`, which the caller decides how to handle
    (the runner catches handler exceptions broadly and logs them).
    """
    response = _get_client().models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": schema,
        },
    )
    return schema.model_validate_json(response.text)
