"""Phase A Task 2 verify — feeds synthetic TaskDB rows to route() and asserts
the expected handler name for each branch. Does not touch the database.

Run from backend/:
    ./.venv/bin/python scripts/check_router.py
Exits non-zero if any case fails.
"""

import sys
from datetime import datetime, timezone

# Allow running directly from backend/ without installing the app as a package.
sys.path.insert(0, ".")

from app.automation.context import MeetingContext
from app.automation.router import _is_self_assignee, route
from app.models import TaskDB


CONTEXT = MeetingContext(
    session_id="s-test",
    session_started_at=datetime(2026, 5, 28, tzinfo=timezone.utc),
    user_display_name="harsh Rathi",
    transcript_excerpt="",
)


def make_task(*, type, action, assignee, source_seq=(1,)):
    return TaskDB(
        task_id="t-test",
        session_id="s-test",
        assignee=assignee,
        action=action,
        type=type,
        confidence="high",
        placement="main_list",
        source_seq=list(source_seq),
    )


# (description, assignee, display_name, expected) — directly exercises the
# _is_self_assignee helper, including the case/whitespace normalisation that
# the scheduling and asana branches rely on for correct routing.
SELF_ASSIGNEE_CASES = [
    ("exact match", "harsh Rathi", "harsh Rathi", True),
    ("case-insensitive match", "HARSH RATHI", "harsh rathi", True),
    ("whitespace-padded match", "  harsh Rathi  ", "harsh Rathi", True),
    ("different person", "Priya", "harsh Rathi", False),
    ("empty assignee", "", "harsh Rathi", False),
]


# (description, task kwargs, expected handler name)
CASES = [
    ("email → gmail",
     dict(type="email", action="Send the Q3 report to the client", assignee="harsh Rathi"),
     "gmail"),

    ("document → notion",
     dict(type="document", action="Write up the design doc for auth", assignee="harsh Rathi"),
     "notion"),

    ("scheduling self + single-seq → calendar_deadline",
     dict(type="scheduling", action="Submit my report", assignee="harsh Rathi", source_seq=(7,)),
     "calendar_deadline"),

    ("scheduling self + multi-seq → calendar_event",
     dict(type="scheduling", action="Kick off the launch", assignee="harsh Rathi", source_seq=(3, 4, 5)),
     "calendar_event"),

    ("scheduling named-other → calendar_event",
     dict(type="scheduling", action="Plan the demo", assignee="Priya", source_seq=(2,)),
     "calendar_event"),

    ("scheduling case-insensitive self-match → calendar_deadline",
     dict(type="scheduling", action="Send my weekly review", assignee="HARSH RATHI", source_seq=(1,)),
     "calendar_deadline"),

    ("other + jira keyword → jira",
     dict(type="other", action="File a Jira ticket for the login bug", assignee="harsh Rathi"),
     "jira"),

    ("other + slack keyword → slack",
     dict(type="other", action="Post in the #ops slack channel", assignee="harsh Rathi"),
     "slack"),

    ("other + named other assignee → asana",
     dict(type="other", action="Investigate the latency regression", assignee="Priya"),
     "asana"),

    ("other + unassigned → todo",
     dict(type="other", action="Look into the new infra ideas", assignee="unassigned"),
     "todo"),

    ("other + self + no keyword → todo",
     dict(type="other", action="Read the new infra docs", assignee="harsh Rathi"),
     "todo"),

    # Documented brittleness: slack-keyword fires before jira-keyword. This
    # case is here to LOCK the current behavior — if a future change re-orders
    # the keyword checks, this assertion will fail loudly rather than silently
    # re-routing existing tasks.
    ("mixed-signal — slack wins over jira (documented brittleness)",
     dict(type="other", action="Slack the team about the Jira bug", assignee="Priya"),
     "slack"),

    ("unknown type → None (manual route)",
     dict(type="future_type_we_dont_know", action="whatever", assignee="harsh Rathi"),
     None),
]


def main() -> int:
    failed = 0
    for desc, assignee, display_name, expected in SELF_ASSIGNEE_CASES:
        actual = _is_self_assignee(assignee, display_name)
        ok = actual == expected
        if not ok:
            failed += 1
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] _is_self_assignee: {desc:<43}  got={actual!r:<7} expected={expected!r}")

    for desc, kwargs, expected in CASES:
        actual = route(make_task(**kwargs), CONTEXT)
        ok = actual == expected
        if not ok:
            failed += 1
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {desc:<60}  got={actual!r:<22} expected={expected!r}")

    total = len(SELF_ASSIGNEE_CASES) + len(CASES)
    passed = total - failed
    print()
    print(f"  {passed}/{total} cases passed.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
