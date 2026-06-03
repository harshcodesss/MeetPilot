import type { ReactNode } from "react";

import { FadeIn } from "@/components/marketing/FadeIn";

/**
 * "MeetPilot in 3 steps" — the how-it-works section, modeled on the reference:
 * a small eyebrow, a headline, then three cards (title · illustration ·
 * description) with hand-drawn Step 1/2/3 arrow markers weaving between them.
 *
 * The three map to MeetPilot's real flow: Capture (read Meet captions) →
 * Extract (find the commitments) → Draft (ready-to-send actions).
 */
const STEPS: {
  label: string;
  title: string;
  body: string;
  illo: ReactNode;
}[] = [
  {
    label: "Step 1",
    title: "Capture",
    body: "MeetPilot reads the live captions in your Google Meet as people speak. It records no audio and uses only the text on screen.",
    illo: <CaptureIllo />,
  },
  {
    label: "Step 2",
    title: "Extract",
    body: "When the meeting ends, MeetPilot finds every commitment, the person who owns it, and the date it is due.",
    illo: <ExtractIllo />,
  },
  {
    label: "Step 3",
    title: "Draft",
    body: "MeetPilot turns each commitment into a draft email, calendar event, or ticket for you to review and approve.",
    illo: <DraftIllo />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            MeetPilot in 3 steps
          </h2>
        </FadeIn>

        {/* Relative wrapper: cards in the middle, step markers in the padding. */}
        <div className="relative mt-12 pt-16 pb-16 lg:mt-16">
          {/* Step markers — decorative, desktop only. */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <div className="absolute top-0 left-[12%] flex items-start gap-2 text-ink-faint">
              <span className="mt-0.5 text-xs font-medium">Step 1</span>
              <ArrowDownRight />
            </div>
            <div className="absolute top-0 right-[12%] flex items-start gap-2 text-ink-faint">
              <ArrowDownLeft />
              <span className="mt-0.5 text-xs font-medium">Step 3</span>
            </div>
            <div className="absolute bottom-0 left-[46%] flex -translate-x-1/2 items-end gap-2 text-ink-faint">
              <span className="mb-0.5 text-xs font-medium">Step 2</span>
              <ArrowUpRight />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.1}>
                <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-6">
                  <h3 className="text-center text-lg font-semibold text-ink">
                    {step.title}
                  </h3>
                  <div className="my-6 flex h-[200px] items-center justify-center">
                    {step.illo}
                  </div>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Illustrations — abstract, mostly grayscale, with semantic color where it
// carries meaning (confidence dots, the approval check).
// ---------------------------------------------------------------------------

function CaptureIllo() {
  return (
    <div className="w-full max-w-[220px] rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3.5">
        {[
          { live: true, w: ["w-20", "w-14"] },
          { live: false, w: ["w-16"] },
          { live: false, w: ["w-24", "w-10"] },
        ].map((row, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${
                row.live ? "bg-primary" : "bg-neutral-200"
              }`}
            />
            <div className="flex flex-1 flex-col gap-1.5">
              {row.w.map((w, j) => (
                <span key={j} className={`h-2 rounded bg-neutral-200 ${w}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExtractIllo() {
  const rows = [
    { dot: "bg-green", w: "w-24" },
    { dot: "bg-yellow", w: "w-16" },
    { dot: "bg-red", w: "w-20" },
  ];
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2.5">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.dot}`} />
          <span className={`h-2 rounded bg-neutral-200 ${r.w}`} />
          <span className="ml-auto h-3.5 w-8 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

function DraftIllo() {
  return (
    <div className="relative h-[150px] w-[180px]">
      {/* Stacked back cards */}
      <div className="absolute left-2 top-3 h-[130px] w-[150px] -rotate-6 rounded-xl border border-line bg-white/70" />
      <div className="absolute right-2 top-2 h-[130px] w-[150px] rotate-6 rounded-xl border border-line bg-white/70" />
      {/* Front draft card */}
      <div className="absolute left-1/2 top-1/2 h-[130px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-white p-3.5 shadow-sm">
        <span className="block h-2.5 w-20 rounded bg-neutral-300" />
        <div className="mt-3 flex flex-col gap-2">
          <span className="h-2 w-full rounded bg-neutral-200" />
          <span className="h-2 w-full rounded bg-neutral-200" />
          <span className="h-2 w-2/3 rounded bg-neutral-200" />
        </div>
      </div>
      {/* Approval check */}
      <span className="absolute -bottom-1 right-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green text-white shadow-md">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M2.5 7.5L5.5 10.5L11.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hand-drawn step arrows
// ---------------------------------------------------------------------------

function ArrowDownRight() {
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" fill="none" aria-hidden>
      <path
        d="M3 7C24 5 42 11 51 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M43 29l9 4 1-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDownLeft() {
  return (
    <svg width="60" height="40" viewBox="0 0 60 40" fill="none" aria-hidden>
      <path
        d="M57 7C36 5 18 11 9 32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 29l-9 4-1-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRight() {
  return (
    <svg width="60" height="44" viewBox="0 0 60 44" fill="none" aria-hidden>
      <path
        d="M4 36C26 40 44 33 52 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M43 15l9-4 1 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
