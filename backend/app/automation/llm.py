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

from app.automation.base import (
    DraftResult,
    HandlerEnvelope,
    QuestionsResult,
)

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


# ============================================================================
# Phase B Task 5a — question-loop helpers
# ============================================================================

# Decision 4 (LOCKED): the question-budget rules block is S4 policy and lives
# here in ONE place. Every handler's prompt template has a `{question_rules}`
# placeholder that this fn fills at render time; per-handler prompt iteration
# stays focused on the handler-specific body, never the policy block.

_DRAFT_OR_ASK_BLOCK = """\
================================================================================
DRAFT-OR-ASK DECISION
================================================================================

This task is LOW or MODERATE confidence — the meeting source for it is
thin, ambiguous, or references things the cited transcript doesn't name.
You may EITHER produce a draft OR ask the user up to {ceiling} clarifying
question(s).

**Trigger to ASK (not draft):** the source action references one or more
UNSPECIFIED nouns that a useful draft would have to name. Examples of
unspecified references:
  - "the partner" / "the client" / "the team"  (which one?)
  - "the document" / "the report" / "the deck" (which one?)
  - "the thing we discussed" / "what we talked about"  (which thing?)
  - "next steps" / "follow up"                 (about what?)

If your draft would just PARAPHRASE the vague action back ("Hi, following
up on what we discussed last week") without filling in what's missing,
ASK INSTEAD. A boilerplate draft helps no one — the recipient learns
nothing and the user has to rewrite it.

**Trigger to DRAFT:** the source action is concrete enough that you can
write content the recipient can actually act on — a named subject, a real
deliverable, a specific reference. If you can produce a draft a reader
would understand without context, draft.

**Question rules:**
- Ask the fewest necessary. If one unlocks it, ask one. Never exceed
  the ceiling of {ceiling}.
- Each question must target a SPECIFIC unresolved reference from the
  source action — no filler, no curiosity, no fact-checks the user
  could derive themselves.
- Do NOT guess identifiers, names, document titles, recipient details,
  deadlines, or amounts. Ask.
- Stable ids: q1, q2, q3, in order.

To return a draft:  set `mode` = "draft", fill the `draft` field per the
                    schema, leave `questions` null.
To ask questions:   set `mode` = "questions", fill `questions` with 1 to
                    {ceiling} items, leave `draft` null. Each question:
                    {{"id": "q1", "text": "...", "hint": "..." | null}}.
"""

_ANSWER_MODE_BLOCK = """\
================================================================================
ANSWER MODE — MUST DRAFT
================================================================================

The user has already answered your prior clarifying questions. You MUST
draft now. Do NOT ask further questions. Return `mode` = "draft" with the
`draft` field filled; leave `questions` null.
"""


def question_rules(ceiling: int, is_answer_mode: bool) -> str:
    """Render the question-budget block for a handler prompt.

    - is_answer_mode=True → must-draft block, regardless of ceiling.
    - ceiling=0 (high-conf, must-draft) → empty (no questions allowed; the
      caller ALSO swaps the response schema to draft-only per Decision 3).
    - ceiling>0 → the draft-or-ask block with the cap rendered in.
    """
    if is_answer_mode:
        return _ANSWER_MODE_BLOCK
    if ceiling == 0:
        return ""
    return _DRAFT_OR_ASK_BLOCK.format(ceiling=ceiling)


def draft_or_ask_with_schema(
    prompt: str,
    draft_schema: type[T],
    ceiling: int,
) -> DraftResult | QuestionsResult:
    """Call Gemini and return DraftResult OR QuestionsResult based on `mode`.

    Decision 3 (LOCKED): ceiling=0 short-circuits to the draft-only schema —
    bit-identical to Phase A's `draft_with_schema`. ceiling>0 wraps the draft
    schema in HandlerEnvelope[T], lets the model choose draft vs questions,
    and parses to the right result type.
    """
    if ceiling == 0:
        draft = draft_with_schema(prompt, draft_schema)
        return DraftResult(fields=draft.model_dump())

    envelope_schema = HandlerEnvelope[draft_schema]
    response = _get_client().models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": envelope_schema,
        },
    )
    envelope = envelope_schema.model_validate_json(response.text)

    if envelope.mode == "draft":
        if envelope.draft is None:
            raise ValueError("envelope mode='draft' but draft field is null")
        return DraftResult(fields=envelope.draft.model_dump())

    # mode == "questions"
    if not envelope.questions:
        raise ValueError("envelope mode='questions' but questions field is empty/null")
    # Defensive ceiling truncate — belt-and-braces in case the model over-asks.
    return QuestionsResult(questions=envelope.questions[:ceiling])
