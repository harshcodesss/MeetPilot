import { FadeIn } from "@/components/marketing/FadeIn";
import { HandlersScanIllo } from "@/components/marketing/HandlersScanIllo";
import { ApproveButton } from "@/components/marketing/ApproveButton";

/**
 * Features — a light bento grid. A framed heading with corner marks, then six
 * cards of varying size. Each pairs a short title + description with a small
 * illustration built from the product's own vocabulary (handler logos,
 * confidence dots, deadline resolution, a clarifying question, the human
 * approval gate, and the captions-not-audio capture model).
 */
export function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <div className="flex flex-col items-center text-center">
            <div className="relative inline-block rounded-xl border border-line px-6 py-3">
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Meetings made actionable
              </h2>
              <Corner className="-left-1 -top-1 border-l border-t" />
              <Corner className="-right-1 -top-1 border-r border-t" />
              <Corner className="-bottom-1 -left-1 border-b border-l" />
              <Corner className="-bottom-1 -right-1 border-b border-r" />
            </div>
            <p className="mt-5 text-base text-ink-muted">
              Every commitment captured, scored, and drafted for you to approve.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {/* Large — handlers */}
            <Card className="md:col-span-2 md:col-start-1 md:row-start-1">
              <CardText
                title="Eight built-in handlers"
                body="Email, calendar events, deadlines, Jira, Slack, Notion, Asana and personal to-dos. Each task is routed to the right one."
              />
              <div className="mt-2 flex flex-1 items-center">
                <HandlersScanIllo />
              </div>
            </Card>

            {/* Tall — confidence */}
            <Card className="md:col-start-3 md:row-start-1 md:row-span-2">
              <CardText
                title="Confidence, color-coded"
                body="Every task ships with a confidence signal, so you know what to trust and what to double-check."
              />
              <div className="mt-6 flex-1">
                <ConfidenceIllo />
              </div>
            </Card>

            {/* Small — deadlines */}
            <Card className="md:col-start-1 md:row-start-2">
              <CardText
                title="Deadlines become real dates"
                body="“By Friday” is resolved against the meeting date, never guessed."
              />
              <div className="mt-5">
                <DeadlineIllo />
              </div>
            </Card>

            {/* Small — clarifies */}
            <Card className="md:col-start-2 md:row-start-2">
              <CardText
                title="Asks before it assumes"
                body="When an owner or detail is unclear, MeetPilot asks a short question instead of guessing. Your answer flows straight into the next draft, so nothing is invented."
              />
              <div className="mt-5">
                <ClarifyIllo />
              </div>
            </Card>

            {/* Small — human gate */}
            <Card className="md:col-start-1 md:row-start-3">
              <CardText
                title="You approve everything"
                body="Nothing is sent on its own. Every draft waits for your click."
              />
              <div className="mt-5">
                <ApproveIllo />
              </div>
            </Card>

            {/* Small — speaker attribution */}
            <Card className="md:col-start-2 md:row-start-3">
              <CardText
                title="Knows who said what"
                body="Google Meet captions are labeled with real names, so every task is assigned to the person who actually committed to it, never a guess."
              />
              <div className="mt-5">
                <SpeakerIllo />
              </div>
            </Card>

            {/* Small — calendar */}
            <Card className="md:col-start-3 md:row-start-3">
              <CardText
                title="Deadlines on a calendar"
                body="Every task with a due date appears on a Day, Week or Month view, colored by confidence."
              />
              <div className="mt-5">
                <CalendarIllo />
              </div>
            </Card>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card scaffolding
// ---------------------------------------------------------------------------

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group flex flex-col rounded-2xl border border-line bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

function CardText({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute h-2.5 w-2.5 border-neutral-300 ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Illustrations
// ---------------------------------------------------------------------------

function ConfidenceIllo() {
  const rows = [
    { task: "Send the Q3 deck", who: "Priya", dot: "bg-green", pill: "High", cls: "bg-green-bg text-green", d: "[animation-delay:0ms]" },
    { task: "Book the offsite venue", who: "Aman", dot: "bg-green", pill: "High", cls: "bg-green-bg text-green", d: "[animation-delay:120ms]" },
    { task: "Draft the press release", who: "Diego", dot: "bg-yellow", pill: "Moderate", cls: "bg-yellow-bg text-yellow-text", d: "[animation-delay:240ms]" },
    { task: "Confirm the vendor budget", who: "Unassigned", dot: "bg-red", pill: "Low", cls: "bg-red-bg text-red", d: "[animation-delay:360ms]" },
    { task: "Share the meeting notes", who: "Priya", dot: "bg-green", pill: "High", cls: "bg-green-bg text-green", d: "[animation-delay:480ms]" },
  ];
  const tdelay = ["", "delay-75", "delay-100", "delay-150", "delay-200"];
  return (
    <div className="flex h-full flex-col justify-between gap-2.5">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-neutral-300 ${tdelay[i]}`}
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 animate-pulse rounded-full ${r.dot} ${r.d}`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{r.task}</p>
            <p className="text-[10px] text-ink-faint">{r.who}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.cls}`}
          >
            {r.pill}
          </span>
        </div>
      ))}
    </div>
  );
}

function DeadlineIllo() {
  const rows = [
    { phrase: "“by Friday”", date: "Fri, Jun 6", d: "[animation-delay:0ms]" },
    { phrase: "“next Tuesday”", date: "Tue, Jun 10", d: "[animation-delay:200ms]" },
    { phrase: "“end of month”", date: "Jun 30", d: "[animation-delay:400ms]" },
  ];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-ink-muted">
            {r.phrase}
          </span>
          <span className="text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5">
            <Arrow />
          </span>
          <span
            className={`animate-pulse rounded-md bg-primary-tint px-2 py-1 text-[11px] font-medium text-primary ${r.d}`}
          >
            {r.date}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClarifyIllo() {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="text-xs text-ink">Who should own this task?</p>
      <div className="mt-2.5 flex gap-2">
        <span className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink-muted transition-transform duration-300 group-hover:-translate-y-0.5">
          Priya
        </span>
        <span className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink-muted transition-transform delay-75 duration-300 group-hover:-translate-y-0.5">
          Aman
        </span>
        <span className="animate-pulse rounded-md border border-primary/30 bg-primary-tint px-2 py-1 text-xs text-primary transition-transform delay-100 duration-300 group-hover:-translate-y-0.5">
          Me
        </span>
      </div>
    </div>
  );
}

function ApproveIllo() {
  return (
    <div className="w-full rounded-xl border border-line bg-surface p-4">
      {/* Header — what this draft targets. */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink">Draft email</span>
        <span className="flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-[11px] text-ink-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/gmail.svg" alt="" className="h-3.5 w-3.5" />
          Gmail
        </span>
      </div>

      {/* Fields — recipient stays blank for you to fill. */}
      <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-ink-faint">To</span>
          <span className="animate-pulse rounded border border-dashed border-line px-2 py-0.5 text-ink-faint">
            add recipient
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-ink-faint">Subject</span>
          <span className="h-2 w-40 rounded bg-neutral-300" />
        </div>
      </div>

      {/* Body preview. */}
      <div className="mt-3 flex flex-col gap-1.5">
        <span className="h-2 w-full rounded bg-neutral-200" />
        <span className="h-2 w-3/4 rounded bg-neutral-200" />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <ApproveButton />
        <span className="rounded-md border border-line bg-white px-3 py-1.5 text-xs text-ink-muted">
          Edit
        </span>
      </div>
    </div>
  );
}

function SpeakerIllo() {
  const rows = [
    { name: "Priya", initial: "P", color: "bg-primary", w: "w-20", owner: true },
    { name: "Aman", initial: "A", color: "bg-green", w: "w-14", owner: false },
    { name: "Diego", initial: "D", color: "bg-yellow", w: "w-24", owner: false },
  ];
  const tdelay = ["", "delay-75", "delay-150"];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 rounded-lg px-1.5 py-1 transition-all duration-300 group-hover:translate-x-0.5 ${tdelay[i]} ${
            r.owner ? "bg-primary-tint/60" : ""
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${r.color} ${
              r.owner ? "animate-pulse" : ""
            }`}
          >
            {r.initial}
          </span>
          <span
            className={`shrink-0 text-[11px] font-medium ${
              r.owner ? "text-primary" : "text-ink-muted"
            }`}
          >
            {r.name}
          </span>
          <span className={`h-2 rounded bg-neutral-200 ${r.w}`} />
          {r.owner ? (
            <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-white">
              owner
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CalendarIllo() {
  // A mini month: a few cells carry a confidence-colored deadline dot; one is
  // "today" (filled blue), mirroring the dashboard calendar.
  const marks: Record<number, string> = {
    3: "bg-green",
    11: "bg-yellow",
    16: "bg-red",
  };
  const today = 9;
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={i}
            className="text-center text-[8px] font-medium text-ink-faint"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 21 }, (_, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-[3px] ${
              i === today ? "animate-pulse bg-primary" : "border border-line bg-white"
            }`}
          >
            {marks[i] && i !== today ? (
              <span className={`h-1 w-1 animate-pulse rounded-full ${marks[i]}`} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden>
      <path
        d="M1 6h17m0 0l-5-4m5 4l-5 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink-faint"
      />
    </svg>
  );
}
