/**
 * Mock data used by `(app)/_dev/taskcard` to render every component
 * permutation offline.
 *
 * Pure data, no React, no API calls. Deleted in Phase 10 Step E along
 * with the `_dev` mount.
 */

import type {
  AsanaDraft,
  CalendarDeadlineDraft,
  CalendarEventDraft,
  GmailDraft,
  JiraDraft,
  NotionDraft,
  Session,
  SlackDraft,
  Task,
  TodoDraft,
} from "@/types";

export const mockSessions: Session[] = [
  {
    session_id: "sess-aaa",
    started_at: "2026-05-28T22:37:00.000Z",
    status: "complete",
    title: "Q3 planning sync",
    segment_count: 47,
    task_count: 5,
    drafts_ready_count: 3,
    awaiting_count: 1,
  },
  {
    session_id: "sess-bbb",
    started_at: "2026-05-27T15:00:00.000Z",
    status: "complete",
    title: null,
    segment_count: 22,
    task_count: 2,
    drafts_ready_count: 0,
    awaiting_count: 2,
  },
  {
    session_id: "sess-ccc",
    started_at: "2026-05-30T09:15:00.000Z",
    status: "active",
    title: "Daily standup",
    segment_count: 8,
    task_count: 0,
    drafts_ready_count: 0,
    awaiting_count: 0,
  },
];

// ---------------------------------------------------------------------------
// Drafts — one per handler so the dev mount can side-by-side every shape
// DraftView (Phase 3.1) needs to render.
// ---------------------------------------------------------------------------

export const mockGmailDraft: GmailDraft = {
  subject: "Q3 report draft for review",
  body:
    "Hi,\n\nI'll have the Q3 report ready by Friday. Sharing a draft so you can " +
    "flag anything before the wider review.\n\nBest,\nHarsh",
  recipient: "",
};

export const mockCalendarEventDraft: CalendarEventDraft = {
  title: "Q3 planning followup",
  start: "2026-06-02T14:00:00.000Z",
  end: "2026-06-02T15:00:00.000Z",
  attendees: ["aman@example.com", "priya@example.com"],
  notes: "Walk through the partner-research findings + agree on Q4 scope.",
};

export const mockCalendarDeadlineDraft: CalendarDeadlineDraft = {
  title: "Q3 report due",
  date: "2026-06-05",
  notes: "Final version. Share-link to leadership channel.",
};

export const mockJiraDraft: JiraDraft = {
  title: "Investigate latency spike on /me/sessions",
  description:
    "Aman flagged ~800ms P95 on the Meetings list yesterday. Should not " +
    "block release but warrants a profile pass on the new badge subqueries.",
  assignee: "aman",
  due: "2026-06-04",
  type: "Task",
};

export const mockSlackDraft: SlackDraft = {
  channel: "#growth",
  message:
    "FYI — we'll circulate the partner research summary on Monday. Holding " +
    "off on a wider share until legal's seen it.",
};

export const mockTodoDraft: TodoDraft = {
  task: "Read the new pricing brief before the leadership review",
  priority: "medium",
  due: "2026-06-01",
};

export const mockNotionDraft: NotionDraft = {
  title: "Q3 retro outline",
  sections: [
    {
      heading: "What worked",
      body:
        "Capture → extract → draft pipeline holds up under real Meet load. " +
        "S1 finalization heuristic only missed two captions across 47 lines.",
    },
    {
      heading: "What didn't",
      body:
        "Deadline resolution against Meet's clock occasionally drifts by a " +
        "day when the meeting straddles midnight in the speaker's locale.",
    },
  ],
};

export const mockAsanaDraft: AsanaDraft = {
  task: "Prep Q3 talking points for leadership",
  assignee: "priya",
  due: "2026-06-03",
};

// ---------------------------------------------------------------------------
// Tasks — every TaskCard body shape the Phase 3.3 mount needs to compare.
// ---------------------------------------------------------------------------

const baseTask: Omit<Task, "task_id" | "draft_state" | "draft" | "handler" | "questions" | "answers" | "is_done" | "placement" | "confidence"> = {
  session_id: "sess-aaa",
  assignee: "harsh",
  action: "Send the Q3 report to leadership by Friday",
  deadline_raw: "by Friday",
  deadline_date: "2026-06-05",
  type: "email",
  source_seq: [1, 4],
  created_at: "2026-05-28T22:37:30.000Z",
};

export const mockTaskDrafted: Task = {
  ...baseTask,
  task_id: "task-drafted-1",
  draft_state: "drafted",
  handler: "gmail",
  questions: null,
  answers: null,
  draft: mockGmailDraft,
  is_done: false,
  placement: "main_list",
  confidence: "high",
};

export const mockTaskAwaiting: Task = {
  ...baseTask,
  task_id: "task-awaiting-1",
  action: "Email the partner about the new pricing",
  draft_state: "awaiting_answers",
  handler: "gmail",
  questions: [
    {
      id: "q1",
      prompt: "Which partner are you emailing?",
      hint: "Name + company is enough — the recipient stays blank.",
    },
    {
      id: "q2",
      prompt: "What's the proposed price point?",
      hint: "A range is fine.",
    },
  ],
  answers: null,
  draft: null,
  is_done: false,
  placement: "main_list",
  confidence: "moderate",
};

export const mockTaskAnswered: Task = {
  ...mockTaskAwaiting,
  task_id: "task-answered-1",
  draft_state: "answered",
  answers: { q1: "Acme Corp", q2: "$80–100k annual" },
};

export const mockTaskExtracted: Task = {
  ...baseTask,
  task_id: "task-extracted-1",
  action: "Research the latest workflow-automation vendors",
  draft_state: "extracted",
  handler: null,
  questions: null,
  answers: null,
  draft: null,
  is_done: false,
  placement: "main_list",
  confidence: "low",
};

export const mockTaskDone: Task = {
  ...mockTaskDrafted,
  task_id: "task-done-1",
  is_done: true,
};

export const mockTaskSuggested: Task = {
  ...baseTask,
  task_id: "task-suggested-1",
  action: "Maybe loop in design on the new dashboard layout",
  deadline_raw: null,
  deadline_date: null,
  draft_state: "extracted",
  handler: null,
  questions: null,
  answers: null,
  draft: null,
  is_done: false,
  placement: "suggested",
  confidence: "low",
};

// ---------------------------------------------------------------------------
// Per-handler drafted tasks — one Task each so the Phase 3.1 dev mount can
// render every DraftView shape side-by-side. Reuses the per-handler mock
// drafts above; each wraps the matching draft + handler in a full Task shell.
// ---------------------------------------------------------------------------

function draftedTaskWith<H extends Task["handler"]>(
  task_id: string,
  handler: H,
  draft: Task["draft"],
  action: string,
): Task {
  return {
    ...baseTask,
    task_id,
    action,
    draft_state: "drafted",
    handler,
    questions: null,
    answers: null,
    draft,
    is_done: false,
    placement: "main_list",
    confidence: "high",
  };
}

export const mockTaskGmail = draftedTaskWith(
  "task-gmail",
  "gmail",
  mockGmailDraft,
  "Send the Q3 report to leadership by Friday",
);
export const mockTaskCalendarEvent = draftedTaskWith(
  "task-cal-event",
  "calendar_event",
  mockCalendarEventDraft,
  "Schedule the Q3 planning followup with Aman and Priya",
);
export const mockTaskCalendarDeadline = draftedTaskWith(
  "task-cal-deadline",
  "calendar_deadline",
  mockCalendarDeadlineDraft,
  "Block out the Q3 report due date on the calendar",
);
export const mockTaskJira = draftedTaskWith(
  "task-jira",
  "jira",
  mockJiraDraft,
  "File a ticket about the /me/sessions latency spike",
);
export const mockTaskSlack = draftedTaskWith(
  "task-slack",
  "slack",
  mockSlackDraft,
  "Post the partner-research timing in #growth",
);
export const mockTaskTodo = draftedTaskWith(
  "task-todo",
  "todo",
  mockTodoDraft,
  "Read the new pricing brief before the leadership review",
);
export const mockTaskNotion = draftedTaskWith(
  "task-notion",
  "notion",
  mockNotionDraft,
  "Draft the Q3 retro outline in Notion",
);
export const mockTaskAsana = draftedTaskWith(
  "task-asana",
  "asana",
  mockAsanaDraft,
  "Assign Q3 talking-points prep to Priya",
);

export const mockHandlerTasks = [
  mockTaskGmail,
  mockTaskCalendarEvent,
  mockTaskCalendarDeadline,
  mockTaskJira,
  mockTaskSlack,
  mockTaskTodo,
  mockTaskNotion,
  mockTaskAsana,
] as const;
