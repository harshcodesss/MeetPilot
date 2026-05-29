"""Phase A Task 4 verify — exercise each of the 8 handlers against a canned
task that should land at it via routing, then print the drafted output for
the mandatory Phase A quality bar review.

Run from backend/:
    ./.venv/bin/python scripts/check_handlers.py
"""

import json
import sys
import time
from datetime import date, datetime, timezone

sys.path.insert(0, ".")

from app.automation.context import MeetingContext
from app.automation.router import route
from app.automation.runner import _HANDLERS
from app.models import TaskDB


CONTEXT = MeetingContext(
    session_id="s-test",
    session_started_at=datetime(2026, 5, 28, 11, 30, tzinfo=timezone.utc),
    user_display_name="harsh Rathi",
    transcript_excerpt=(
        "[seq=1] [harsh Rathi] So before we wrap, a couple of things.\n"
        "[seq=2] [harsh Rathi] I'll email Acme Corp the Q3 revenue report by Friday.\n"
        "[seq=3] [harsh Rathi] Priya, can you investigate the latency regression on checkout by next Tuesday?\n"
        "[seq=4] [harsh Rathi] We also need to file a Jira ticket for the login redirect bug.\n"
        "[seq=5] [harsh Rathi] And I'll post in the #ops slack channel when the deploy is done.\n"
        "[seq=6] [harsh Rathi] Let's schedule the launch kickoff with the marketing team next Wednesday.\n"
        "[seq=7] [harsh Rathi] I need to submit my expense report by EOW.\n"
        "[seq=8] [harsh Rathi] I'll write up the architecture doc for the new caching layer.\n"
        "[seq=9] [harsh Rathi] Also, personally I want to read up on the new caching-layer design ideas this weekend.\n"
    ),
)


def _filter_excerpt(full_excerpt: str, seqs: list[int]) -> str:
    """Keep only lines whose seq is in `seqs`, in original order.

    Mirrors what `runner.build_context_for_task` does in production: each
    handler should only see the transcript lines its task cites, not the
    whole meeting. Without this filter, the model latches onto the most
    action-y line in the full excerpt instead of the cited one.
    """
    if not seqs:
        return ""
    wanted = set(seqs)
    out: list[str] = []
    for line in full_excerpt.splitlines():
        if not line.startswith("[seq="):
            continue
        try:
            seq_num = int(line.split("]", 1)[0][len("[seq="):])
        except ValueError:
            continue
        if seq_num in wanted:
            out.append(line)
    return "\n".join(out)


def make_task(*, type, action, assignee, source_seq, deadline_raw=None, deadline_date=None, confidence="high"):
    return TaskDB(
        task_id=f"t-{type[:3]}-{source_seq[0]}",
        session_id="s-test",
        assignee=assignee,
        action=action,
        deadline_raw=deadline_raw,
        deadline_date=deadline_date,
        type=type,
        confidence=confidence,
        placement="main_list",
        source_seq=list(source_seq),
    )


# One task per handler branch. Each task is hand-crafted to be specific enough
# that a good draft is possible — no thin-source excuse.
CASES = [
    ("gmail",
     make_task(type="email",
               action="Email Acme Corp the Q3 revenue report",
               assignee="harsh Rathi",
               source_seq=(2,),
               deadline_raw="by Friday",
               deadline_date=date(2026, 5, 29))),

    ("notion",
     make_task(type="document",
               action="Write up the architecture doc for the new caching layer",
               assignee="harsh Rathi",
               source_seq=(8,))),

    ("calendar_deadline",
     make_task(type="scheduling",
               action="Submit expense report",
               assignee="harsh Rathi",
               source_seq=(7,),
               deadline_raw="by EOW",
               deadline_date=date(2026, 5, 29))),

    # Multi-seq source so the calendar_event branch fires (single-seq +
    # self routes to calendar_deadline, by design — see router heuristics).
    ("calendar_event",
     make_task(type="scheduling",
               action="Schedule launch kickoff with the marketing team",
               assignee="harsh Rathi",
               source_seq=(6, 7),
               deadline_raw="next Wednesday",
               deadline_date=date(2026, 6, 3))),

    ("jira",
     make_task(type="other",
               action="File a Jira ticket for the login redirect bug",
               assignee="harsh Rathi",
               source_seq=(4,))),

    ("slack",
     make_task(type="other",
               action="Post in the #ops slack channel when the deploy is done",
               assignee="harsh Rathi",
               source_seq=(5,))),

    ("asana",
     make_task(type="other",
               action="Investigate the latency regression on checkout",
               assignee="Priya",
               source_seq=(3,),
               deadline_raw="by next Tuesday",
               deadline_date=date(2026, 6, 2))),

    ("todo",
     make_task(type="other",
               action="Read up on the new caching-layer design ideas",
               assignee="unassigned",
               source_seq=(9,))),
]


# Gemini free tier is 5 RPM on gemini-2.5-flash — sleep between calls to
# stay under the cap. Total runtime ≈ 8 × 13s = ~105s.
RATE_LIMIT_SLEEP_S = 13


def main() -> int:
    failures = 0
    for i, (expected_name, task) in enumerate(CASES):
        # Confirm routing sends it to the right handler first.
        actual_name = route(task, CONTEXT)
        if actual_name != expected_name:
            print(f"\n[ROUTE FAIL] task {task.task_id} routed to {actual_name!r}, expected {expected_name!r}")
            failures += 1
            continue

        handler = _HANDLERS[expected_name]

        # Per-case context: filter the shared transcript down to this task's
        # cited seqs, so the prompt only sees the lines it should.
        per_case_ctx = MeetingContext(
            session_id=CONTEXT.session_id,
            session_started_at=CONTEXT.session_started_at,
            user_display_name=CONTEXT.user_display_name,
            transcript_excerpt=_filter_excerpt(CONTEXT.transcript_excerpt, task.source_seq),
        )

        t0 = time.perf_counter()
        try:
            result = handler.draft_or_ask(task, per_case_ctx)
        except Exception as exc:  # noqa: BLE001
            print(f"\n[DRAFT FAIL] {expected_name}: {exc!r}")
            failures += 1
            continue
        elapsed = time.perf_counter() - t0

        print(f"\n{'=' * 80}")
        print(f"  {expected_name.upper():<20} (took {elapsed:.1f}s)")
        print(f"  source action: {task.action}")
        print(f"  source assignee: {task.assignee}")
        print(f"  source deadline: raw={task.deadline_raw!r}, date={task.deadline_date}")
        print(f"{'-' * 80}")
        # `result` is a DraftResult; pretty-print its fields dict.
        print(json.dumps(result.fields, indent=2, default=str))

        # Spacing between calls so the free-tier 5 RPM cap doesn't 429 us.
        if i < len(CASES) - 1:
            time.sleep(RATE_LIMIT_SLEEP_S)

    print(f"\n{'=' * 80}")
    print(f"  {len(CASES) - failures}/{len(CASES)} handlers produced a draft.")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
