from datetime import datetime


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

The meeting started at: {started_at_iso}
Use that timestamp as the anchor for relative phrases.

Rules:
- ALWAYS preserve the speaker's exact phrasing in deadline_raw (e.g.
  "by Friday", "end of next week", "before the demo").
- ONLY fill deadline_date when you can resolve it with high confidence
  ("by Friday" relative to a known week = yes; "soon" or "eventually" = no).
- Ambiguous, vague, or non-temporal phrases → deadline_date: null.
- A WRONG date is worse than no date. When in doubt, leave it null.
- If there is no deadline at all → deadline_raw: null, deadline_date: null.

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


def build_prompt(transcript: str, started_at: datetime) -> str:
    """Render the extraction prompt for a single session.

    `started_at` is the meeting anchor; the LLM uses it to resolve relative
    deadline phrases like "by Friday" into absolute dates.
    """
    return PROMPT_TEMPLATE.format(
        started_at_iso=started_at.isoformat(),
        transcript=transcript,
    )
