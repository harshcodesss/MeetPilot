"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * The animated illustration for the Extraction slide of the login carousel.
 *
 * Mirrors Subsystem 3, the brain: the speaker-labeled transcript goes to the
 * LLM and structured action items come back — each with an assignee, an
 * action, a resolved deadline, and a confidence color (green = trust,
 * yellow = glance, red = review). Tasks pop out of the transcript one by one;
 * the footer counts what was found and how many need a human's eyes.
 */
type Confidence = "high" | "moderate" | "low";

type Task = {
  assignee: string;
  initials: string;
  color: string;
  action: string;
  deadline: string | null;
  confidence: Confidence;
};

const TASKS: Task[] = [
  {
    assignee: "Priya",
    initials: "P",
    color: "#1a73e8",
    action: "Send the Q3 deck",
    deadline: "Thu, Jun 12",
    confidence: "high",
  },
  {
    assignee: "Aman",
    initials: "A",
    color: "#ea4335",
    action: "Book a design review",
    deadline: "Next week",
    confidence: "moderate",
  },
  {
    assignee: "Diego",
    initials: "D",
    color: "#34a853",
    action: "Own the API migration",
    deadline: null,
    confidence: "high",
  },
  {
    assignee: "Unassigned",
    initials: "?",
    color: "#80868b",
    action: "Update the launch checklist",
    deadline: null,
    confidence: "low",
  },
];

const CONFIDENCE: Record<
  Confidence,
  { label: string; dot: string; bg: string; text: string }
> = {
  high: { label: "High", dot: "#34a853", bg: "var(--color-green-bg)", text: "#34a853" },
  moderate: { label: "Moderate", dot: "#fbbc04", bg: "var(--color-yellow-bg)", text: "#b06000" },
  low: { label: "Low", dot: "#ea4335", bg: "var(--color-red-bg)", text: "#ea4335" },
};

const REVEAL_MS = 1300; // gap between tasks appearing
const HOLD_MS = 2800; // pause once all are shown, before the loop resets

export function ExtractionScene() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown < TASKS.length) {
      const t = setTimeout(() => setShown((s) => s + 1), REVEAL_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown(0), HOLD_MS);
    return () => clearTimeout(t);
  }, [shown]);

  const visible = TASKS.slice(0, shown);
  const done = shown >= TASKS.length;
  const needsReview = visible.filter((t) => t.confidence === "low").length;

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]">
      {/* Header — the extractor working over the transcript. */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
            <SparkIcon />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-ink">Action items</p>
            <p className="text-[11px] text-ink-faint">from the transcript</p>
          </div>
        </div>
        {done ? (
          <div className="flex items-center gap-1.5 rounded-full bg-green-bg px-2.5 py-1">
            <CheckIcon />
            <span className="text-[11px] font-semibold text-green">Done</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full bg-primary-tint px-2.5 py-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extracted task cards. */}
      <div className="flex h-[264px] flex-col justify-start gap-2 overflow-hidden px-4 py-4">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((task) => (
            <motion.div
              key={task.action}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <TaskCard task={task} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer — what was found, and what wants review. */}
      <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <motion.span
            key={shown}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-xs font-semibold tabular-nums text-ink"
          >
            {shown}
          </motion.span>
          <span className="text-[11px] text-ink-muted">action items</span>
        </div>
        {needsReview > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red" />
            <span className="text-[11px] font-medium text-ink-muted">
              {needsReview} needs review
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const c = CONFIDENCE[task.confidence];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 shadow-sm">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
        style={{ backgroundColor: task.color }}
      >
        {task.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{task.action}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] text-ink-muted">{task.assignee}</span>
          {task.deadline && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
              <CalIcon />
              {task.deadline}
            </span>
          )}
        </div>
      </div>
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: c.bg, color: c.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
        {c.label}
      </span>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z"
        fill="currentColor"
      />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="#34a853"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
