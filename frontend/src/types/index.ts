/**
 * Frontend mirrors of the backend data contracts.
 *
 * Mirror = same field names + same value-set semantics. Keep these aligned
 * with the Pydantic models in `backend/app/api/{me,tasks,answers}.py` and
 * `backend/app/models.py`. Single source of truth on the frontend; every page
 * + component imports from here so a backend rename is one edit away from
 * being type-checked.
 */

// ---------------------------------------------------------------------------
// Discriminated unions for task state
// ---------------------------------------------------------------------------

export type Confidence = "high" | "moderate" | "low";
export type Placement = "main_list" | "suggested" | "dismissed";
export type DraftState =
  | "extracted"
  | "awaiting_answers"
  | "answered"
  | "drafted";

export type Handler =
  | "gmail"
  | "calendar_event"
  | "calendar_deadline"
  | "jira"
  | "slack"
  | "todo"
  | "notion"
  | "asana";

// ---------------------------------------------------------------------------
// Drafted-action payloads — per-handler shapes the worker writes into `draft`
// ---------------------------------------------------------------------------

export interface GmailDraft {
  subject: string;
  body: string;
  recipient: string; // intentionally blank by design — user fills it
}

export interface CalendarEventDraft {
  title: string;
  start: string; // ISO datetime
  end: string;
  attendees: string[];
  notes?: string;
}

export interface CalendarDeadlineDraft {
  title: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface JiraDraft {
  title: string;
  description: string;
  assignee: string;
  due?: string | null;
  type?: string;
}

export interface SlackDraft {
  channel: string;
  message: string;
}

export interface TodoDraft {
  task: string;
  priority?: "low" | "medium" | "high";
  due?: string | null;
}

export interface NotionDraft {
  title: string;
  sections: Array<{ heading: string; body: string }>;
}

export interface AsanaDraft {
  task: string;
  assignee: string;
  due?: string | null;
}

export type Draft =
  | GmailDraft
  | CalendarEventDraft
  | CalendarDeadlineDraft
  | JiraDraft
  | SlackDraft
  | TodoDraft
  | NotionDraft
  | AsanaDraft;

// ---------------------------------------------------------------------------
// Clarification loop
// ---------------------------------------------------------------------------

export interface Question {
  id: string;
  prompt: string;
  hint?: string;
}

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Task {
  task_id: string;
  session_id: string;
  assignee: string;
  action: string;
  deadline_raw: string | null;
  deadline_date: string | null; // ISO date (YYYY-MM-DD)
  type: string;
  confidence: Confidence;
  placement: Placement;
  source_seq: number[];
  draft_state: DraftState;
  handler: Handler | null;
  questions: Question[] | null;
  answers: Record<string, string> | null;
  draft: Draft | null;
  is_done: boolean;
  created_at: string; // ISO datetime
}

/** Slim projection for the Calendar page — `/me/tasks/deadlines`. */
export interface TaskDeadline {
  task_id: string;
  session_id: string;
  assignee: string;
  action: string;
  deadline_date: string;
  draft_state: DraftState;
  handler: Handler | null;
  confidence: Confidence;
  placement: Placement;
  is_done: boolean;
}

export interface Session {
  session_id: string;
  started_at: string;
  status: "active" | "complete";
  title: string | null;
  segment_count: number;
  task_count: number;
  drafts_ready_count: number;
  awaiting_count: number;
}

export interface SessionDetail {
  session: {
    session_id: string;
    started_at: string;
    status: "active" | "complete";
    title: string | null;
    segment_count: number;
    task_count: number;
  };
  tasks: Task[];
}

export interface Segment {
  seq: number;
  speaker: string;
  text: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// `/me/stats` — dashboard top row
// ---------------------------------------------------------------------------

export interface Stats {
  meetings_this_week: number;
  tasks_this_week: number;
  drafts_ready: number;
  action_required: number;
  window_days: number;
}
