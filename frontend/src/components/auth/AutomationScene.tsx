"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * The animated illustration for the Automation slide of the login carousel.
 *
 * Mirrors Subsystem 4, the agent layer: each extracted task is routed to a
 * handler and its fields are drafted from meeting context. This is the genuine
 * agentic part — tool selection plus parameter synthesis — but it is gated on
 * a human click, never autonomous. The scene cycles through drafted actions
 * (Gmail, Calendar, Jira, Slack); the Approve button auto-"clicks" into a
 * Sent / Drafted state, then advances. The Gmail recipient is left blank for
 * the user to fill, per the locked rule: never guess an address.
 */
type Field = {
  label: string;
  value: string;
  placeholder?: string; // renders a "fill me in" chip instead of a value
  body?: boolean; // multi-line body text
};

type Draft = {
  handler: string;
  logo: string;
  live: boolean;
  cta: string;
  done: string;
  fields: Field[];
};

const DRAFTS: Draft[] = [
  {
    handler: "Gmail",
    logo: "/logos/gmail.svg",
    live: true,
    cta: "Approve & send",
    done: "Sent",
    fields: [
      { label: "To", value: "", placeholder: "Add recipient" },
      { label: "Subject", value: "Q3 deck for review" },
      {
        label: "",
        value: "Hi team, sharing the Q3 deck ahead of Thursday. Let me know any edits.",
        body: true,
      },
    ],
  },
  {
    handler: "Calendar",
    logo: "/logos/google-calendar.svg",
    live: true,
    cta: "Add to calendar",
    done: "Scheduled",
    fields: [
      { label: "Event", value: "Design review" },
      { label: "When", value: "Tue, Jun 10 · 2:00 PM" },
      { label: "Guests", value: "Aman, Priya, Diego" },
    ],
  },
  {
    handler: "Jira",
    logo: "/logos/jira.svg",
    live: false,
    cta: "Create issue",
    done: "Drafted",
    fields: [
      { label: "Title", value: "API migration" },
      { label: "Assignee", value: "Diego" },
      { label: "Due", value: "This sprint" },
    ],
  },
  {
    handler: "Slack",
    logo: "/logos/slack.svg",
    live: false,
    cta: "Post message",
    done: "Drafted",
    fields: [
      { label: "Channel", value: "#launch" },
      {
        label: "Message",
        value: "Reminder: the vendor follow-up is due today.",
        body: true,
      },
    ],
  },
];

type Phase = "review" | "sending" | "done";

const REVIEW_MS = 2400;
const SENDING_MS = 750;
const DONE_MS = 1500;

export function AutomationScene() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("review");

  useEffect(() => {
    if (phase === "review") {
      const t = setTimeout(() => setPhase("sending"), REVIEW_MS);
      return () => clearTimeout(t);
    }
    if (phase === "sending") {
      const t = setTimeout(() => setPhase("done"), SENDING_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % DRAFTS.length);
      setPhase("review");
    }, DONE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const draft = DRAFTS[index];

  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)]">
      {/* Header — which handler this task was routed to. */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white p-1.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.logo} alt={draft.handler} className="h-full w-full object-contain" />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-ink">{draft.handler}</p>
            <p className="text-[11px] text-ink-faint">AI drafted</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            draft.live ? "bg-green-bg text-green" : "bg-done-bg text-ink-muted"
          }`}
        >
          {draft.live ? "Live" : "Draft"}
        </span>
      </div>

      {/* Drafted fields — swap with a crossfade between handlers. */}
      <div className="relative h-[176px] px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-2.5"
          >
            {draft.fields.map((f, i) => (
              <FieldRow key={i} field={f} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer — the human gate: one click to approve. */}
      <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-3">
        <ApproveButton phase={phase} draft={draft} />
        <div className="flex items-center gap-1.5">
          {DRAFTS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-ink" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldRow({ field }: { field: Field }) {
  return (
    <div className="flex items-start gap-2.5">
      {field.label && (
        <span className="mt-0.5 w-14 shrink-0 text-[11px] font-medium text-ink-faint">
          {field.label}
        </span>
      )}
      {field.placeholder ? (
        // Blank recipient — never guessed; the user fills it in.
        <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 bg-primary-tint px-2 py-0.5 text-[12px] font-medium text-primary">
          <PlusIcon />
          {field.placeholder}
        </span>
      ) : (
        <p
          className={`text-[12px] leading-snug ${
            field.body ? "text-ink-muted" : "font-medium text-ink"
          } ${!field.label ? "rounded-lg bg-surface px-3 py-2" : ""}`}
        >
          {field.value}
        </p>
      )}
    </div>
  );
}

function ApproveButton({ phase, draft }: { phase: Phase; draft: Draft }) {
  if (phase === "done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-green px-4 py-2 text-[13px] font-semibold text-white">
        <CheckIcon />
        {draft.done}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-transform ${
        phase === "sending" ? "scale-95 bg-neutral-800" : "bg-neutral-900"
      }`}
    >
      {phase === "sending" ? (
        <>
          <Spinner />
          Working…
        </>
      ) : (
        <>
          {draft.cta}
          <span aria-hidden>→</span>
        </>
      )}
    </span>
  );
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
