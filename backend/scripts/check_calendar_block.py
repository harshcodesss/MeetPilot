"""Unit-style checks for the verbatim calendar block in extraction/prompt.py —
a pure function, no Gemini call, no database.

`_build_calendar_block` renders the weekday→date lookup the model consults so
it never does calendar arithmetic itself; a wrong row here silently corrupts
every relative-deadline resolution. These checks lock its shape.

Run from backend/:
    ./.venv/bin/python scripts/check_calendar_block.py
Exits non-zero if any case fails.
"""

import sys
from datetime import datetime, timedelta

# Allow running directly from backend/ without installing the app as a package.
sys.path.insert(0, ".")

from app.extraction.prompt import _build_calendar_block

# 2026-05-27 is a Wednesday — a fixed anchor so the asserted tags are stable.
ANCHOR = datetime(2026, 5, 27)


def check_row_count() -> list[str]:
    """14 rows: the meeting day plus the next 13 days."""
    failures = []
    rows = _build_calendar_block(ANCHOR).splitlines()
    if len(rows) != 14:
        failures.append(f"expected 14 rows, got {len(rows)}")
    return failures


def check_dates_are_sequential_and_verbatim() -> list[str]:
    """Each row's date is the anchor + its row index, formatted YYYY-MM-DD."""
    failures = []
    rows = _build_calendar_block(ANCHOR).splitlines()
    for i, row in enumerate(rows):
        expected_date = (ANCHOR + timedelta(days=i)).strftime("%Y-%m-%d")
        expected_weekday = (ANCHOR + timedelta(days=i)).strftime("%A")
        if expected_date not in row:
            failures.append(f"row {i} missing date {expected_date!r}: {row!r}")
        if expected_weekday not in row:
            failures.append(f"row {i} missing weekday {expected_weekday!r}: {row!r}")
    return failures


def check_marker_tags() -> list[str]:
    """The four positional markers land on the right rows."""
    failures = []
    rows = _build_calendar_block(ANCHOR).splitlines()

    expectations = [
        (0, "← meeting day"),
        (1, "← tomorrow"),
        (7, "← one week later"),
        (13, "(next week)"),
    ]
    for idx, marker in expectations:
        if marker not in rows[idx]:
            failures.append(f"row {idx} missing marker {marker!r}: {rows[idx]!r}")

    # Same-week filler rows (2..6) carry no marker.
    for idx in range(2, 7):
        if "←" in rows[idx] or "(next week)" in rows[idx]:
            failures.append(f"row {idx} should be unmarked: {rows[idx]!r}")

    return failures


def main() -> int:
    checks = [
        ("row_count", check_row_count),
        ("dates_sequential_and_verbatim", check_dates_are_sequential_and_verbatim),
        ("marker_tags", check_marker_tags),
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
