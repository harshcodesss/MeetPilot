from datetime import datetime, timedelta, timezone


PROMPT_TEMPLATE = """\
You are extracting concrete commitments from a meeting transcript. The output
will populate a follow-up dashboard, so quality matters more than quantity.

================================================================================
OUTPUT SCHEMA
================================================================================

Return a JSON array of Task objects. Each Task has exactly these fields:

  assignee       string            person who owes the action, or "unassigned"
  action         string            imperative phrasing, e.g. "Send the Q3 report"
  deadline_raw   string or null    verbatim deadline phrase, e.g. "by Friday"
  deadline_date  "YYYY-MM-DD"|null  resolved date, only when confident
  type           enum              email | scheduling | document | other
  confidence     enum              high | moderate | low
  placement      enum              main_list | suggested
  source_seq     [int, ...]        ALL contributing seqs from the transcript

If no tasks are found, return an empty array: [].

================================================================================
ASSIGNEE — priority order
================================================================================

1. Named person ("Priya, can you handle this?")            → "Priya"
2. The speaker volunteers ("I'll take care of it")         → the speaker's name
3. Neither applies                                          → "unassigned"

An "unassigned" task is still a real task. Do NOT drop it. Do NOT route it to
"suggested" just because no one volunteered — see PLACEMENT below.

================================================================================
DEADLINES
================================================================================

Meeting anchor (use this as the reference for ALL relative phrases):
  Day-of-week: {meeting_weekday}
  Date:        {meeting_date_iso}
  Full ISO:    {started_at_iso}

(For context — current timestamp at extraction time: {now_iso}. This is NOT the
anchor; always resolve relative phrases against the meeting anchor above.)

Date lookup — use these dates VERBATIM. Do NOT compute weekdays yourself:

{calendar_block}

Resolution rules:

- "by <weekday>", "on <weekday>", "this <weekday>"
    → that weekday's date FROM THE TABLE ABOVE.
    The deadline IS that day, NOT the day after. This is critical.
    Example: meeting on Wednesday 2026-05-27, speaker says "by Friday"
      → deadline_date: 2026-05-29  (Friday itself)
      → deadline_date: 2026-05-30  is WRONG (that's Saturday)
    Example: same meeting, speaker says "by Thursday"
      → deadline_date: 2026-05-28  (Thursday itself)
      → deadline_date: 2026-05-29  is WRONG.

- "next <weekday>" → the FOLLOWING calendar week's occurrence (skip past the
  same-week one in the table). The table marks these explicitly with
  "(next week)".

- "tomorrow"                  → meeting day + 1 (the row labeled tomorrow).
- "end of this week" / "EOW"  → Friday's date from the table.
- "by next week"   (no specific day)  → ambiguous; set deadline_date: null.
- "soon" / "eventually" / "ASAP"      → vague; set deadline_date: null.

Always preserve the speaker's verbatim phrasing in `deadline_raw`
(e.g. "by Friday", "end of next week", "before the demo").

A WRONG date is worse than no date. When in doubt, set deadline_date: null.
If there is no deadline at all: deadline_raw: null AND deadline_date: null.

================================================================================
TYPE — what kind of follow-up action does this commitment imply?
================================================================================

  email       — needs to send/reply to an email
  scheduling  — needs to schedule a meeting, event, or set a calendar reminder
  document    — needs to write, update, or share documentation/notes
  other       — doesn't fit the above (ticket, message, personal todo, etc.)

If multiple categories could fit, pick the most specific.

================================================================================
PLACEMENT — the gate (run this FIRST for every candidate)
================================================================================

Ask: "Is this even a real commitment?"

  main_list   — confident this IS a real commitment someone owes.
  suggested   — unsure-it-belongs. A holding area for the user to triage.
                The user will click Add to promote or Dismiss to drop.

Important nuances:
- Placement is about whether a TASK exists, NOT about who owns it.
- A real, clearly-stated commitment with no clear owner stays on the MAIN_LIST
  with assignee="unassigned" and confidence="low". Do NOT hide it under
  "suggested". (Owner doubt and task doubt are different axes.)
- Use "suggested" only when you genuinely doubt whether the speaker meant to
  commit to anything actionable.

================================================================================
CONFIDENCE — only meaningful on main_list rows
================================================================================

  high      — clear, unambiguous commitment with clear owner
  moderate  — commitment is clear but something (owner, scope, deadline) is fuzzy
  low       — real-sounding commitment but you have notable doubts

This is a coarse signal, not a calibrated probability. Emit confidence for
"suggested" tasks too — the dashboard will simply ignore it until promotion.

================================================================================
source_seq — citation requirement
================================================================================

Every line in the transcript below is prefixed with [seq=N]. When you emit a
task, source_seq MUST contain ALL the seq numbers whose content informed the
task, not just the first one.

Example: if Aman says "ship Q3 by Friday" at seq=12 and Priya says "I'll
handle it" at seq=14, the task's source_seq is [12, 14] — both lines
contributed.

================================================================================
PRECISION OVER RECALL (most important rule)
================================================================================

One missed task is mildly annoying. Three invented tasks destroy trust in the
entire dashboard. Bias hard toward fewer, cleaner tasks.

When in doubt:
  - Genuine doubt about ownership but clear task → main_list + unassigned + low
  - Genuine doubt about whether a task even exists → suggested + low
  - Genuine doubt that this is anything actionable → do NOT emit at all

NOT tasks — common false positives to suppress:

  ✗ "We should eventually look into that."           (too vague, no commitment)
  ✗ "It might be nice if someone wrote docs."        (hypothetical, no owner)
  ✗ "I already sent that yesterday."                 (past, completed)
  ✗ "How was your weekend?" / "Sounds good."         (small talk)
  ✗ "The Q3 numbers look strong."                    (statement of fact)
  ✗ "Maybe we could try that approach."              (suggestion, not commitment)

================================================================================
TRANSCRIPT
================================================================================

{transcript}

================================================================================
OUTPUT
================================================================================

Return ONLY the JSON array. No prose, no markdown fences, no commentary.
"""


def _build_calendar_block(started_at: datetime) -> str:
    """Render a verbatim weekday→date lookup the model can consult without
    doing any calendar arithmetic itself. Covers the meeting day plus the
    next 13 days so both same-week and "next <weekday>" phrases resolve."""
    rows = []
    for i in range(14):
        d = started_at + timedelta(days=i)
        weekday = d.strftime("%A")
        date_iso = d.strftime("%Y-%m-%d")
        if i == 0:
            tag = " ← meeting day"
        elif i == 1:
            tag = " ← tomorrow"
        elif i < 7:
            tag = ""
        elif i == 7:
            tag = " ← one week later"
        else:
            tag = "  (next week)"
        rows.append(f"  {weekday:<10} {date_iso}{tag}")
    return "\n".join(rows)


def build_prompt(transcript: str, started_at: datetime) -> str:
    """Render the extraction prompt for a single session.

    `started_at` is the meeting anchor; all relative deadline phrases
    ("by Friday", "tomorrow", "next week") resolve against it. We give the
    model both the weekday name AND a pre-computed 14-day calendar so it
    never has to derive weekdays on its own.
    """
    return PROMPT_TEMPLATE.format(
        meeting_weekday=started_at.strftime("%A"),
        meeting_date_iso=started_at.strftime("%Y-%m-%d"),
        started_at_iso=started_at.isoformat(),
        now_iso=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        calendar_block=_build_calendar_block(started_at),
        transcript=transcript,
    )
