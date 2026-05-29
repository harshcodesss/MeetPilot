"""CR-1 smoke test for Phase B Task 5a — does Gemini's structured-output mode
accept a discriminated Union[DraftEnvelope, QuestionsEnvelope] schema?

If YES (both paths return valid JSON matching their respective variants):
  proceed with Union[A, B] for the handler envelope.
If NO (either call errors, or the model returns invalid/wrong-variant JSON):
  fall back to a single-envelope model
  `HandlerOutput(mode, draft: Optional[...], questions: Optional[...])`.

Costs 2 Gemini calls. Run from backend/:
    ./.venv/bin/python scripts/smoke_union_schema.py
"""

import json
import os
import sys
from typing import Literal, Union

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field, RootModel
from typing_extensions import Annotated


class DraftPart(BaseModel):
    mode: Literal["draft"]
    subject: str
    body: str


class Question(BaseModel):
    id: str
    text: str


class QuestionsPart(BaseModel):
    mode: Literal["questions"]
    questions: list[Question]


HandlerOutput = RootModel[
    Annotated[Union[DraftPart, QuestionsPart], Field(discriminator="mode")]
]


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
            "Return JSON with mode='draft', subject='Q3 report follow-up', "
            "body='Hi, attaching the Q3 report as discussed.'",
        ),
        (
            "QUESTIONS PATH",
            "Return JSON with mode='questions' and a single question: "
            "id='q1', text='What is the recipient email?'",
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
                    "response_schema": HandlerOutput,
                },
            )
        except Exception as exc:
            print(f"  [API ERROR] {exc!r}")
            failures += 1
            continue

        raw = resp.text
        print(f"  raw response: {raw}")
        try:
            parsed = HandlerOutput.model_validate_json(raw)
            inner = parsed.root
            print(f"  parsed variant: {type(inner).__name__}")
            print(f"  parsed JSON:    {json.dumps(inner.model_dump(), indent=2)}")
        except Exception as exc:
            print(f"  [PARSE ERROR] {exc!r}")
            failures += 1

    print(f"\n{'=' * 60}")
    if failures == 0:
        print("  ✓ Union schema works on both paths.")
        return 0
    print(f"  ✗ {failures}/2 paths failed — fall back to single-envelope.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
