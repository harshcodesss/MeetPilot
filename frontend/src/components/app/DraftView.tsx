import type {
  AsanaDraft,
  CalendarDeadlineDraft,
  CalendarEventDraft,
  GmailDraft,
  Handler,
  JiraDraft,
  NotionDraft,
  SlackDraft,
  Task,
  TodoDraft,
} from "@/types";

/**
 * Renders the drafted action's per-handler fields. Branches on `task.handler`
 * to pick the right shape, then casts `task.draft` to the matching type — the
 * worker writes them as co-varying pairs (handler+draft) so the runtime
 * invariant holds; the cast captures it for TypeScript.
 *
 * Read-only by design. Nothing in v1 sends the action; the user reviews the
 * draft and clicks "Mark as done" on a separate surface. Live-send arrives
 * in S4 v2 and lives outside this component.
 *
 * Color discipline (brief): no decorative green/yellow/red. Categories like
 * task type or priority stay neutral — they're not severity signals.
 *
 * Gmail recipient is intentionally blank (locked in CLAUDE.md). We render an
 * honest read-only line saying so rather than a fake-interactive input.
 */
export function DraftView({ task }: { task: Task }) {
  if (!task.handler || !task.draft) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
        No drafted action for this task. Mark it done manually when complete.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <HandlerHeader handler={task.handler} />
      <div className="rounded-xl border border-line bg-white p-4">
        <HandlerBody task={task} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-handler bodies
// ---------------------------------------------------------------------------

function HandlerBody({ task }: { task: Task }) {
  switch (task.handler) {
    case "gmail":
      return <GmailBody draft={task.draft as GmailDraft} />;
    case "calendar_event":
      return <CalendarEventBody draft={task.draft as CalendarEventDraft} />;
    case "calendar_deadline":
      return <CalendarDeadlineBody draft={task.draft as CalendarDeadlineDraft} />;
    case "jira":
      return <JiraBody draft={task.draft as JiraDraft} />;
    case "slack":
      return <SlackBody draft={task.draft as SlackDraft} />;
    case "todo":
      return <TodoBody draft={task.draft as TodoDraft} />;
    case "notion":
      return <NotionBody draft={task.draft as NotionDraft} />;
    case "asana":
      return <AsanaBody draft={task.draft as AsanaDraft} />;
    default:
      return null;
  }
}

function GmailBody({ draft }: { draft: GmailDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Subject" value={draft.subject} />
      <FieldRow
        label="Recipient"
        value={
          <span className="italic text-ink-faint">
            (you’ll fill this in when sending)
          </span>
        }
      />
      <FieldBlock label="Body">
        <p className="whitespace-pre-wrap text-sm text-ink">{draft.body}</p>
      </FieldBlock>
    </dl>
  );
}

function CalendarEventBody({ draft }: { draft: CalendarEventDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Title" value={draft.title} />
      <FieldRow label="When" value={formatRange(draft.start, draft.end)} />
      <FieldRow
        label="Attendees"
        value={
          draft.attendees.length > 0
            ? draft.attendees.join(", ")
            : <span className="text-ink-faint">none</span>
        }
      />
      {draft.notes ? (
        <FieldBlock label="Notes">
          <p className="whitespace-pre-wrap text-sm text-ink">{draft.notes}</p>
        </FieldBlock>
      ) : null}
    </dl>
  );
}

function CalendarDeadlineBody({ draft }: { draft: CalendarDeadlineDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Title" value={draft.title} />
      <FieldRow label="Date" value={formatDate(draft.date)} />
      <FieldRow label="All-day" value="Yes (no attendees)" />
      {draft.notes ? (
        <FieldBlock label="Notes">
          <p className="whitespace-pre-wrap text-sm text-ink">{draft.notes}</p>
        </FieldBlock>
      ) : null}
    </dl>
  );
}

function JiraBody({ draft }: { draft: JiraDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Title" value={draft.title} />
      <FieldRow label="Assignee" value={draft.assignee} />
      {draft.type ? <FieldRow label="Type" value={draft.type} /> : null}
      {draft.due ? <FieldRow label="Due" value={formatDate(draft.due)} /> : null}
      <FieldBlock label="Description">
        <p className="whitespace-pre-wrap text-sm text-ink">{draft.description}</p>
      </FieldBlock>
    </dl>
  );
}

function SlackBody({ draft }: { draft: SlackDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Channel" value={draft.channel} />
      <FieldBlock label="Message">
        <p className="whitespace-pre-wrap text-sm text-ink">{draft.message}</p>
      </FieldBlock>
    </dl>
  );
}

function TodoBody({ draft }: { draft: TodoDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Task" value={draft.task} />
      {draft.priority ? <FieldRow label="Priority" value={draft.priority} /> : null}
      {draft.due ? <FieldRow label="Due" value={formatDate(draft.due)} /> : null}
    </dl>
  );
}

function NotionBody({ draft }: { draft: NotionDraft }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Title" value={draft.title} />
      {draft.sections.map((section, idx) => (
        <FieldBlock key={`${section.heading}-${idx}`} label={section.heading}>
          <p className="whitespace-pre-wrap text-sm text-ink">{section.body}</p>
        </FieldBlock>
      ))}
    </div>
  );
}

function AsanaBody({ draft }: { draft: AsanaDraft }) {
  return (
    <dl className="space-y-3">
      <FieldRow label="Task" value={draft.task} />
      <FieldRow label="Assignee" value={draft.assignee} />
      {draft.due ? <FieldRow label="Due" value={formatDate(draft.due)} /> : null}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives — kept local; not part of the public component API.
// ---------------------------------------------------------------------------

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header — handler name + small badge so the user knows what they're looking at
// ---------------------------------------------------------------------------

const HANDLER_LABEL: Record<Handler, string> = {
  gmail: "Email draft",
  calendar_event: "Calendar event",
  calendar_deadline: "Calendar deadline",
  jira: "Jira ticket",
  slack: "Slack message",
  todo: "To-do",
  notion: "Notion page",
  asana: "Asana task",
};

function HandlerHeader({ handler }: { handler: Handler }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
      {HANDLER_LABEL[handler]}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  // ISO date (YYYY-MM-DD) or datetime — Date can parse both. We strip the
  // time component for date-only fields by using toLocaleDateString.
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.toDateString() === end.toDateString();
  const dateOpts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, dateOpts)} · ${start.toLocaleTimeString(undefined, timeOpts)} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
  }
  return `${start.toLocaleDateString(undefined, dateOpts)} ${start.toLocaleTimeString(undefined, timeOpts)} – ${end.toLocaleDateString(undefined, dateOpts)} ${end.toLocaleTimeString(undefined, timeOpts)}`;
}
