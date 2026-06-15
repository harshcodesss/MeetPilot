"""Unit-style checks for the question-budget helpers in automation/base.py
and automation/llm.py — pure functions, no Gemini calls, no database.

Run from backend/:
    ./.venv/bin/python scripts/check_question_rules.py
Exits non-zero if any case fails.
"""

import sys

# Allow running directly from backend/ without installing the app as a package.
sys.path.insert(0, ".")

from app.automation.base import question_ceiling_for
from app.automation.llm import _render_qa_block, question_rules


def check_question_ceiling_for() -> list[str]:
    """Confidence → question-budget ceiling (Decision 3 / Flow PDF §3)."""
    failures = []
    cases = [
        ("high", 0),
        ("moderate", 1),
        ("low", 3),
        ("unknown-confidence-value", 0),  # defaults to 0, same as high
    ]
    for confidence, expected in cases:
        actual = question_ceiling_for(confidence)
        if actual != expected:
            failures.append(
                f"question_ceiling_for({confidence!r}) = {actual!r}, expected {expected!r}"
            )
    return failures


def check_render_qa_block() -> list[str]:
    """Prior-question + answer rendering, per CR-3's three answer states."""
    failures = []

    no_prior = _render_qa_block(None, None)
    if "no prior questions on record" not in no_prior:
        failures.append(f"_render_qa_block(None, None) missing placeholder text: {no_prior!r}")

    prior = [
        {"id": "q1", "text": "Which client?"},
        {"id": "q2", "text": "What's the deadline?"},
        {"id": "q3", "text": "Any extra context?"},
    ]
    answers = {"q1": "Acme Corp", "q2": ""}  # q3 intentionally absent
    rendered = _render_qa_block(prior, answers)

    if 'q1: "Which client?"' not in rendered or '→ "Acme Corp"' not in rendered:
        failures.append(f"answered question not rendered verbatim: {rendered!r}")
    if "(blank — user declined)" not in rendered:
        failures.append(f"empty-string answer should render as declined: {rendered!r}")
    if "(no answer submitted)" not in rendered:
        failures.append(f"missing-key answer should render as not submitted: {rendered!r}")

    return failures


def check_question_rules() -> list[str]:
    """ceiling/is_answer_mode branching (Decision 3 + Decision 6)."""
    failures = []

    # ceiling=0, first call → empty (draft-only schema is used instead).
    empty = question_rules(ceiling=0, is_answer_mode=False)
    if empty != "":
        failures.append(f"question_rules(ceiling=0, is_answer_mode=False) should be '', got {empty!r}")

    # ceiling>0, first call → draft-or-ask block with the ceiling interpolated.
    draft_or_ask = question_rules(ceiling=2, is_answer_mode=False)
    if "{ceiling}" in draft_or_ask:
        failures.append("question_rules left an unformatted '{ceiling}' placeholder")
    if "up to 2 clarifying" not in draft_or_ask:
        failures.append(f"question_rules(ceiling=2) did not interpolate the ceiling: {draft_or_ask!r}")

    # is_answer_mode=True → must-draft block, regardless of ceiling.
    answer_mode = question_rules(ceiling=1, is_answer_mode=True, prior_questions=None, answers=None)
    if "MUST DRAFT" not in answer_mode:
        failures.append(f"answer-mode block missing MUST DRAFT instruction: {answer_mode!r}")
    if "no prior questions on record" not in answer_mode:
        failures.append(f"answer-mode block did not render the qa block: {answer_mode!r}")

    return failures


def main() -> int:
    checks = [
        ("question_ceiling_for", check_question_ceiling_for),
        ("_render_qa_block", check_render_qa_block),
        ("question_rules", check_question_rules),
    ]

    total_failures: list[str] = []
    for name, check in checks:
        failures = check()
        status = "PASS" if not failures else "FAIL"
        print(f"  [{status}] {name}")
        for failure in failures:
            print(f"         - {failure}")
        total_failures.extend(failures)

    print()
    if total_failures:
        print(f"  {len(total_failures)} failure(s).")
        return 1
    print("  all checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
