import Link from "next/link";

import { FadeIn } from "@/components/marketing/FadeIn";

/**
 * Landing — the visual high point. Built simple in Phase 1, polished here
 * in Phase 11 (LAST per the build sequence). Server Component for SEO +
 * fast first paint; FadeIn drops to client only where animation is needed.
 *
 * Sections, top-down:
 *   1. Hero with brand mark + tagline + Continue-with-Google CTA
 *   2. "What MeetPilot does" three-card row
 *   3. "How it works" three-step flow
 *   4. Features grid (six cards)
 *   5. Closing CTA band
 *
 * Logo: typographic mark in primary blue. If a 3D glossy logo asset lands,
 * swap the <BrandMark> contents — every other call site (marketing layout,
 * sidebar, auth layout) already imports nothing here, so this is the single
 * source for the landing brand visual.
 */

export default function MarketingHome() {
  return (
    <>
      <Hero />
      <WhatItDoes />
      <HowItWorks />
      <Features />
      <ClosingCta />
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft brand-tint backdrop — radial gradient that fades to white. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[500px] bg-gradient-to-b from-primary-tint to-white"
      />
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">
        <FadeIn>
          <BrandMark />
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
            Turn meetings into
            <br />
            <span className="text-primary">ready-to-send</span> action items.
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-muted sm:text-xl">
            MeetPilot watches your Google Meet, pulls out who owes what by
            when, and drafts the follow-up work for one-click approval. The
            AI proposes. You dispose.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-medium text-white shadow-soft hover:bg-primary-hover transition-colors sm:text-lg"
          >
            Continue with Google
            <span aria-hidden>→</span>
          </Link>
        </FadeIn>
        <FadeIn delay={0.4}>
          <p className="mt-4 text-xs text-ink-faint">
            No audio recording. No live sending. You review every draft.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function BrandMark() {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3 shadow-soft ring-1 ring-line">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white shadow-soft"
      >
        M
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">
        MeetPilot
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. What it does — three-card row
// ---------------------------------------------------------------------------

const WHAT_CARDS = [
  {
    title: "Capture",
    body:
      "A Chrome extension reads Google Meet's on-screen captions in real time. No audio, no recording, no speech model.",
  },
  {
    title: "Extract",
    body:
      "Gemini reads the transcript and finds the commitments — who said they'd do what, by when, with what level of confidence.",
  },
  {
    title: "Draft",
    body:
      "Each task gets a handler-shaped draft (email, calendar event, ticket, Slack message, …) ready for your review.",
  },
];

function WhatItDoes() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <FadeIn>
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What MeetPilot does
        </h2>
      </FadeIn>
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {WHAT_CARDS.map((card, i) => (
          <FadeIn key={card.title} delay={i * 0.1}>
            <div className="h-full rounded-2xl border border-line bg-white p-6 shadow-soft">
              <div className="text-xs font-medium uppercase tracking-wide text-primary">
                Step {i + 1}
              </div>
              <h3 className="mt-2 text-xl font-semibold text-ink">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {card.body}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. How it works — three-step flow
// ---------------------------------------------------------------------------

const STEPS = [
  {
    n: "01",
    title: "You meet",
    body:
      "Install the extension once. It auto-detects Google Meet and starts capturing captions when you click Start.",
  },
  {
    n: "02",
    title: "MeetPilot listens",
    body:
      "Caption lines flow into the backend in real time. When the meeting ends, extraction runs against the full transcript.",
  },
  {
    n: "03",
    title: "You approve",
    body:
      "Drafts land on the dashboard. Review each one, fill in missing context, mark done when you've actually sent it.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto max-w-5xl px-6">
        <FadeIn>
          <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-muted">
            Three steps. No surprises. The AI never sends anything without
            your explicit click.
          </p>
        </FadeIn>
        <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={i * 0.1}>
              <li className="relative">
                <span className="text-5xl font-bold text-primary-tint">
                  {step.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Features grid
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    title: "Eight action handlers",
    body:
      "Gmail, Calendar events, deadlines, Jira tickets, Slack messages, Notion pages, Asana tasks, personal to-dos.",
  },
  {
    title: "Clarifies vague tasks",
    body:
      "If the LLM isn't sure about a detail, it asks. Your answers flow back into the next draft attempt.",
  },
  {
    title: "Deadlines, tracked",
    body:
      "Phrases like \"by Friday\" become real dates against the meeting's calendar context. Overdue items don't hide.",
  },
  {
    title: "Confidence-scored",
    body:
      "Every task ships with a high / moderate / low confidence pill. Trust the greens; review the reds.",
  },
  {
    title: "Human-in-the-loop",
    body:
      "No live sending in this version. Every draft is displayed; you copy it where it needs to go.",
  },
  {
    title: "Google-only sign-in",
    body:
      "One button. No passwords. Identity scopes only — Gmail and Calendar tokens are deferred until live-send lands.",
  },
];

function Features() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <FadeIn>
        <h2 className="text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What&rsquo;s inside
        </h2>
      </FadeIn>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feat, i) => (
          <FadeIn key={feat.title} delay={(i % 3) * 0.1}>
            <div className="h-full rounded-2xl border border-line bg-white p-5">
              <h3 className="text-base font-semibold text-ink">
                {feat.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {feat.body}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. Closing CTA
// ---------------------------------------------------------------------------

function ClosingCta() {
  return (
    <section className="px-6 pb-24 pt-4">
      <FadeIn>
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-12 text-center shadow-soft">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Stop losing what you agreed to.
          </h2>
          <p className="mt-3 text-base text-white/80">
            Sign in with Google. Install the extension. Run a meeting.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-medium text-primary shadow-soft hover:bg-surface transition-colors"
          >
            Continue with Google
            <span aria-hidden>→</span>
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
