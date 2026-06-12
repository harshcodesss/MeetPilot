"""CR-1 fallback smoke — does Gemini accept a single-envelope schema with
Optional[draft] / Optional[questions] fields, parameterized per-handler via
Pydantic Generic?

If YES: envelope factory is the path. Each handler stays a thin model.
If NO on generic but YES on a manually-built envelope: Option C — per-handler
envelopes hand-defined (still cleaner than the Union we just ruled out).

Run from backend/:
    ./.venv/bin/python scripts/smoke_envelope_schema.py
"""

import os
import sys
from typing import Generic, Literal, Optional, TypeVar

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel


class Question(BaseModel):
    id: str
    text: str
    hint: Optional[str] = None


T = TypeVar("T", bound=BaseModel)


class HandlerEnvelope(BaseModel, Generic[T]):
    mode: Literal["draft", "questions"]
    draft: Optional[T] = None
    questions: Optional[list[Question]] = None


class GmailDraft(BaseModel):
    subject: str
    body: str
    recipient: str = ""


GmailEnvelope = HandlerEnvelope[GmailDraft]


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY missing", file=sys.stderr)
        return 1

    client = genai.Client(api_key=api_key)
    model = "gemini-3.1-flash-lite"

    cases = [
        (
            "DRAFT PATH",
            "Return JSON with mode='draft' and a draft object with "
            "subject='Q3 report follow-up' and body='Hi, attaching the Q3 "
            "report as discussed.' and recipient=''. Leave questions as null.",
        ),
        (
            "QUESTIONS PATH",
            "Return JSON with mode='questions' and a questions array of "
            "one item: id='q1', text='What is the recipient email?', "
            "hint=null. Leave draft as null.",
        ),
    ]

    failures = 0
    for label, prompt in cases:
        print(f"\n{'=' * 60}\n  {label}\n{'-' * 60}")
        try:
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": GmailEnvelope,
                },
            )
        except Exception as exc:
            print(f"  [API ERROR] {exc!r}")
            failures += 1
            continue

        raw = resp.text
        print(f"  raw response: {raw}")
        try:
            parsed = GmailEnvelope.model_validate_json(raw)
            print(f"  mode: {parsed.mode}")
            print(f"  draft: {parsed.draft}")
            print(f"  questions: {parsed.questions}")
        except Exception as exc:
            print(f"  [PARSE ERROR] {exc!r}")
            failures += 1

    print(f"\n{'=' * 60}")
    if failures == 0:
        print("  ✓ Generic envelope shape works.")
        return 0
    print(f"  ✗ {failures}/2 paths failed — try Option C (manual envelopes).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
