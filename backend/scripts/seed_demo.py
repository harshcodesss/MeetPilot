"""Seed demo data into the local SQLite DB for UI iteration.

UI-iteration helper only. Creates a self-contained demo user + realistic
meetings + tasks covering every UI state so we can hammer on the frontend
without capturing real meetings every time.

States covered:
  - placement:   main_list, suggested, dismissed
  - confidence:  high, moderate, low (the three confidence colours)
  - handler:     gmail, calendar_event, calendar_deadline, jira, slack,
                 todo, notion, asana, plus None (manual task)
  - draft_state: extracted, awaiting_answers, answered, drafted
  - deadline:    overdue, today, future, no-deadline
  - assignee:    real name, "unassigned"
  - is_done:     true and false

Run from backend/:
    ./.venv/bin/python scripts/seed_demo.py

Idempotent: a re-run wipes the previous demo data and re-seeds. Won't
touch any real user rows created by signing in with Google — those use
their own google_sub.
"""
import os
import secrets
import sys
from datetime import date, datetime, timedelta, timezone

# Make the backend app package importable when run as a script.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import User, AuthSession, SessionDB, SegmentDB, TaskDB

# Stable identifiers for the demo user so re-runs find + wipe the right row.
DEMO_GOOGLE_SUB = "seed-demo-harsh"
DEMO_EMAIL = "demo@meetpilot.local"
DEMO_NAME = "Demo User"

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    user = db.query(User).filter_by(google_sub=DEMO_GOOGLE_SUB).first()
    if user:
        session_ids = [
            s.session_id
            for s in db.query(SessionDB).filter_by(user_id=user.user_id).all()
        ]
        if session_ids:
            db.query(TaskDB).filter(TaskDB.session_id.in_(session_ids)).delete(
                synchronize_session=False
            )
            db.query(SegmentDB).filter(SegmentDB.session_id.in_(session_ids)).delete(
                synchronize_session=False
            )
            db.query(SessionDB).filter(SessionDB.session_id.in_(session_ids)).delete(
                synchronize_session=False
            )
        db.query(AuthSession).filter_by(user_id=user.user_id).delete()
        db.commit()
    else:
        user = User(
            google_sub=DEMO_GOOGLE_SUB,
            email=DEMO_EMAIL,
            display_name=DEMO_NAME,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = secrets.token_hex(32)
    db.add(AuthSession(token=token, user_id=user.user_id))
    db.commit()

    TODAY = date.today()
    NOW = datetime.now(timezone.utc)

    # ---- Session 1: ~2h ago, the showcase meeting with mixed states ----
    s1 = SessionDB(
        user_id=user.user_id,
        started_at=NOW - timedelta(hours=2),
        status="complete",
        title="Weekly sync — client updates",
    )
    db.add(s1)
    db.commit()
    db.refresh(s1)

    s1_lines = [
        ("Demo User", "Thanks everyone for joining the weekly sync. Let's run through what came out of the client calls."),
        ("Demo User", "First thing — I'll send the follow-up email to the client summarising today's decisions by Friday."),
        ("Priya Sharma", "Sounds good. I can take the deck updates."),
        ("Demo User", "Great Priya. Can you also create a Jira ticket for the login bug Sam reported yesterday?"),
        ("Priya Sharma", "Yeah, I'll file that this afternoon."),
        ("Demo User", "We should probably schedule a follow-up meeting with the client next week to walk them through the revised timeline."),
        ("Demo User", "Someone needs to book the conference room for the demo."),
        ("Demo User", "Also, the contract renewal paperwork is due tomorrow morning, I cannot let that slip."),
        ("Demo User", "Let's post a quick summary to the team Slack channel, so folks who couldn't make it are in the loop."),
        ("Aman Singh", "I need to do some research and put together a report, but I'm not totally sure on the scope yet."),
        ("Demo User", "And I think we should document the architecture decisions we made — moving from the cube-based to the queue-based system."),
        ("Demo User", "Okay, that covers it. Thanks everyone."),
    ]
    for i, (speaker, text) in enumerate(s1_lines, start=1):
        db.add(SegmentDB(
            session_id=s1.session_id, seq=i, speaker=speaker, text=text,
            timestamp=s1.started_at + timedelta(seconds=i * 30),
        ))

    s1_tasks = [
        # 1. Drafted email — gmail · high · future deadline
        dict(
            assignee="Demo User",
            action="Send follow-up email to client summarising today's decisions",
            deadline_raw="by Friday",
            deadline_date=TODAY + timedelta(days=4),
            type="email", confidence="high", placement="main_list",
            source_seq=[2],
            draft_state="drafted", handler="gmail",
            questions=None, answers=None,
            draft={
                "subject": "Weekly sync — client decisions recap",
                "body": (
                    "Hi,\n\n"
                    "Quick recap of today's decisions:\n"
                    "- Deck updates underway (Priya)\n"
                    "- Jira ticket filed for the login bug\n"
                    "- Follow-up scheduled for next week\n\n"
                    "Let me know if I missed anything.\n\n"
                    "Best,\nDemo"
                ),
                "recipient": "",
            },
            is_done=False,
        ),
        # 2. Drafted ticket — jira · high · today
        dict(
            assignee="Priya Sharma",
            action="File Jira ticket for the login bug Sam reported",
            deadline_raw="this afternoon",
            deadline_date=TODAY,
            type="ticket", confidence="high", placement="main_list",
            source_seq=[4, 5],
            draft_state="drafted", handler="jira",
            questions=None, answers=None,
            draft={
                "title": "Login bug — password reset link expires too fast",
                "description": (
                    "Reported by Sam yesterday. The password reset link expires "
                    "before users complete the reset flow. Reproduce: request a "
                    "reset and wait 5+ minutes before clicking the link."
                ),
                "assignee": "Priya Sharma",
                "due": TODAY.isoformat(),
            },
            is_done=False,
        ),
        # 3. Drafted meeting — calendar_event · moderate
        dict(
            assignee="Demo User",
            action="Schedule follow-up meeting with client next week",
            deadline_raw="next week",
            deadline_date=TODAY + timedelta(days=7),
            type="meeting", confidence="moderate", placement="main_list",
            source_seq=[6],
            draft_state="drafted", handler="calendar_event",
            questions=None, answers=None,
            draft={
                "title": "Client follow-up — revised timeline walkthrough",
                "attendees": [],
                "start_time": (NOW + timedelta(days=7)).isoformat(),
                "duration_minutes": 30,
            },
            is_done=False,
        ),
        # 4. Awaiting answers — todo · low · no deadline (the clarification path)
        dict(
            assignee="Aman Singh",
            action="Research and put together a report",
            deadline_raw=None, deadline_date=None,
            type="task", confidence="low", placement="main_list",
            source_seq=[10],
            draft_state="awaiting_answers", handler="todo",
            questions=[
                {"id": "q1", "text": "What's the topic of the report?", "hint": "A short phrase Demo can recognise."},
                {"id": "q2", "text": "Who is the report for?", "hint": "Internal team, the client, leadership?"},
                {"id": "q3", "text": "When does it need to be done?", "hint": "A rough deadline if you have one."},
            ],
            answers=None, draft=None, is_done=False,
        ),
        # 5. Unassigned — calendar_deadline · moderate
        dict(
            assignee="unassigned",
            action="Book conference room for the demo",
            deadline_raw=None, deadline_date=None,
            type="task", confidence="moderate", placement="main_list",
            source_seq=[7],
            draft_state="drafted", handler="calendar_deadline",
            questions=None, answers=None,
            draft={
                "title": "Book conference room — demo",
                "date": (TODAY + timedelta(days=5)).isoformat(),
            },
            is_done=False,
        ),
        # 6. OVERDUE — calendar_deadline · high · past deadline
        dict(
            assignee="Demo User",
            action="Submit contract renewal paperwork",
            deadline_raw="tomorrow",
            deadline_date=TODAY - timedelta(days=1),
            type="task", confidence="high", placement="main_list",
            source_seq=[8],
            draft_state="drafted", handler="calendar_deadline",
            questions=None, answers=None,
            draft={
                "title": "Contract renewal paperwork — DUE",
                "date": (TODAY - timedelta(days=1)).isoformat(),
            },
            is_done=False,
        ),
        # 7. Slack draft — done
        dict(
            assignee="Demo User",
            action="Post quick summary to team Slack channel",
            deadline_raw=None, deadline_date=None,
            type="message", confidence="moderate", placement="main_list",
            source_seq=[9],
            draft_state="drafted", handler="slack",
            questions=None, answers=None,
            draft={
                "channel": "#team",
                "message": (
                    "Weekly sync recap: deck updates underway, Jira ticket filed "
                    "for the login bug, client follow-up scheduled for next week. "
                    "Full notes in the meeting recording."
                ),
            },
            is_done=True,
        ),
        # 8. Notion draft — moderate · multi-section
        dict(
            assignee="Demo User",
            action="Document architecture decisions: cube-based → queue-based system",
            deadline_raw=None, deadline_date=None,
            type="task", confidence="moderate", placement="main_list",
            source_seq=[11],
            draft_state="drafted", handler="notion",
            questions=None, answers=None,
            draft={
                "title": "Architecture decision — Queue-based system migration",
                "sections": [
                    {"heading": "Context", "body": "We've outgrown the cube-based system. Performance degrades under concurrent load."},
                    {"heading": "Decision", "body": "Migrate to a queue-based system."},
                    {"heading": "Next steps", "body": "Spike the prototype this week, full migration plan next sprint."},
                ],
            },
            is_done=False,
        ),
        # 9. Asana draft — high · this week
        dict(
            assignee="Priya Sharma",
            action="Update the client deck with the revised timeline",
            deadline_raw="this week",
            deadline_date=TODAY + timedelta(days=3),
            type="task", confidence="high", placement="main_list",
            source_seq=[3],
            draft_state="drafted", handler="asana",
            questions=None, answers=None,
            draft={
                "task": "Update client deck — revised timeline",
                "assignee": "Priya Sharma",
                "due": (TODAY + timedelta(days=3)).isoformat(),
            },
            is_done=False,
        ),
        # 10. SUGGESTED — placement holding area, no handler yet
        dict(
            assignee="Demo User",
            action="Send swag package to the client team",
            deadline_raw=None, deadline_date=None,
            type="task", confidence="moderate", placement="suggested",
            source_seq=[1],
            draft_state="extracted", handler=None,
            questions=None, answers=None, draft=None, is_done=False,
        ),
        # 11. DISMISSED — exists in DB but should not surface on main views
        dict(
            assignee="Aman Singh",
            action="Look into migrating the old analytics tools",
            deadline_raw=None, deadline_date=None,
            type="task", confidence="low", placement="dismissed",
            source_seq=[10],
            draft_state="extracted", handler=None,
            questions=None, answers=None, draft=None, is_done=False,
        ),
    ]
    for t in s1_tasks:
        db.add(TaskDB(session_id=s1.session_id, **t))

    # ---- Session 2: 4 days ago, all tasks done ----------------------
    s2 = SessionDB(
        user_id=user.user_id,
        started_at=NOW - timedelta(days=4),
        status="complete",
        title="Sprint planning — Q3 backlog",
    )
    db.add(s2)
    db.commit()
    db.refresh(s2)

    s2_lines = [
        ("Demo User", "Let's wrap up the sprint plan."),
        ("Priya Sharma", "I'll write the test plan by Wednesday."),
        ("Aman Singh", "I'll schedule the design review with the team."),
    ]
    for i, (speaker, text) in enumerate(s2_lines, start=1):
        db.add(SegmentDB(
            session_id=s2.session_id, seq=i, speaker=speaker, text=text,
            timestamp=s2.started_at + timedelta(seconds=i * 30),
        ))

    s2_tasks = [
        dict(
            assignee="Priya Sharma",
            action="Write test plan",
            deadline_raw="by Wednesday",
            deadline_date=TODAY - timedelta(days=1),
            type="task", confidence="high", placement="main_list",
            source_seq=[2],
            draft_state="drafted", handler="todo",
            questions=None, answers=None,
            draft={
                "title": "Write test plan",
                "due": (TODAY - timedelta(days=1)).isoformat(),
            },
            is_done=True,
        ),
        dict(
            assignee="Aman Singh",
            action="Schedule design review",
            deadline_raw=None, deadline_date=None,
            type="meeting", confidence="moderate", placement="main_list",
            source_seq=[3],
            draft_state="drafted", handler="calendar_event",
            questions=None, answers=None,
            draft={
                "title": "Design review",
                "attendees": [],
                "start_time": (NOW - timedelta(days=2)).isoformat(),
                "duration_minutes": 45,
            },
            is_done=True,
        ),
    ]
    for t in s2_tasks:
        db.add(TaskDB(session_id=s2.session_id, **t))

    # ---- Session 3: yesterday, the rare "answered but not yet drafted" ----
    s3 = SessionDB(
        user_id=user.user_id,
        started_at=NOW - timedelta(days=1),
        status="complete",
        title="1:1 with mentor",
    )
    db.add(s3)
    db.commit()
    db.refresh(s3)

    s3_lines = [
        ("Demo User", "I'm thinking about which side project to push next."),
        ("Aman Singh", "Make sure you write up the postmortem from last week's incident."),
    ]
    for i, (speaker, text) in enumerate(s3_lines, start=1):
        db.add(SegmentDB(
            session_id=s3.session_id, seq=i, speaker=speaker, text=text,
            timestamp=s3.started_at + timedelta(seconds=i * 30),
        ))

    s3_tasks = [
        # `answered` is the transient state between user submitting answers
        # and the worker finishing the re-draft. Useful for testing the
        # spinner/transition UI even when nothing's actually pending.
        dict(
            assignee="Demo User",
            action="Write up the postmortem from last week's incident",
            deadline_raw=None,
            deadline_date=TODAY + timedelta(days=2),
            type="task", confidence="moderate", placement="main_list",
            source_seq=[2],
            draft_state="answered", handler="notion",
            questions=[{"id": "q1", "text": "Which incident?", "hint": None}],
            answers={"q1": "The Friday outage where the queue worker locked up."},
            draft=None, is_done=False,
        ),
    ]
    for t in s3_tasks:
        db.add(TaskDB(session_id=s3.session_id, **t))

    db.commit()

    sess_count = db.query(SessionDB).filter_by(user_id=user.user_id).count()
    seg_count = (
        db.query(SegmentDB)
        .join(SessionDB)
        .filter(SessionDB.user_id == user.user_id)
        .count()
    )
    task_count = (
        db.query(TaskDB)
        .join(SessionDB)
        .filter(SessionDB.user_id == user.user_id)
        .count()
    )

    print()
    print("=" * 64)
    print("SEEDED")
    print("=" * 64)
    print(f"User:     {user.display_name} <{user.email}>")
    print(f"Meetings: {sess_count}")
    print(f"Segments: {seg_count}")
    print(f"Tasks:    {task_count}")
    print()
    print("TOKEN (for the frontend):")
    print(f"  {token}")
    print()
    print("To 'sign in' as the demo user:")
    print("  1. Open http://localhost:3000 in a browser tab.")
    print("  2. Open DevTools (Cmd+Opt+I) → Console.")
    print(f"  3. Run:  localStorage.setItem('meetpilot_token', '{token}')")
    print("  4. Reload the page.")
    print()
finally:
    db.close()
