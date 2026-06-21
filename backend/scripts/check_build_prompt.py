"""Unit-style checks for build_prompt in extraction/prompt.py — a pure
function, no Gemini call, no database.

build_prompt interpolates the meeting anchor, a pre-computed calendar block,
and the transcript into PROMPT_TEMPLATE. A stray unfilled placeholder or a
missing transcript would silently degrade every extraction, so these checks
lock the rendering contract.

Run from backend/:
    ./.venv/bin/python scripts/check_build_prompt.py
Exits non-zero if any case fails.
"""

import sys
from datetime import datetime

# Allow running directly from backend/ without installing the app as a package.
sys.path.insert(0, ".")

from app.extraction.prompt import _build_calendar_block, build_prompt

# 2026-05-27 is a Wednesday — a fixed anchor so asserted strings are stable.
ANCHOR = datetime(2026, 5, 27)
TRANSCRIPT = "[seq=1] [Priya] Send the Q3 report by Friday."


def check_no_unfilled_placeholders() -> list[str]:
    """Every {placeholder} in the template must be interpolated away."""
    failures = []
    rendered = build_prompt(TRANSCRIPT, ANCHOR)
    if "{" in rendered or "}" in rendered:
        failures.append(f"rendered prompt still contains brace placeholders: {rendered!r}")
    return failures


def check_transcript_embedded() -> list[str]:
    """The caller's transcript text appears verbatim in the prompt."""
    failures = []
    rendered = build_prompt(TRANSCRIPT, ANCHOR)
    if TRANSCRIPT not in rendered:
        failures.append("transcript text missing from rendered prompt")
    return failures


def check_anchor_and_calendar_present() -> list[str]:
    """The weekday name, ISO date, and full calendar block are interpolated."""
    failures = []
    rendered = build_prompt(TRANSCRIPT, ANCHOR)
    if "Wednesday" not in rendered:
        failures.append("meeting weekday name missing from rendered prompt")
    if "2026-05-27" not in rendered:
        failures.append("meeting ISO date missing from rendered prompt")
    if _build_calendar_block(ANCHOR) not in rendered:
        failures.append("calendar block missing from rendered prompt")
    return failures


def main() -> int:
    checks = [
        ("no_unfilled_placeholders", check_no_unfilled_placeholders),
        ("transcript_embedded", check_transcript_embedded),
        ("anchor_and_calendar_present", check_anchor_and_calendar_present),
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
