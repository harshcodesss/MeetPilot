import Link from "next/link";

import { FadeIn } from "@/components/marketing/FadeIn";
import { DemoSection } from "@/components/marketing/DemoSection";
import { IntegrationsSection } from "@/components/marketing/IntegrationsSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Highlighter } from "@/components/ui/highlighter";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

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
      <DemoSection />
      <IntegrationsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ClosingCta />
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative -mt-20 overflow-hidden pt-20">
      {/* B&W theme: a near-white backdrop with one soft blue wash up top — the
          only color in the section, so the blue reads as a deliberate accent. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary-tint/60 via-white to-white"
      />
      {/* Interactive ripple grid — click a cell to fan a pulse outward. */}
      <BackgroundRippleEffect />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-36 pb-24 text-center">
        <FadeIn>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
            Every meeting,
            <br />
            turned to action.
          </h1>
        </FadeIn>
        <FadeIn delay={0.1} y={0}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted sm:text-xl">
            Your meeting copilot captures{" "}
            <Highlighter action="highlight" color="#cfe3ff" isView>
              every commitment
            </Highlighter>{" "}
            from a Google Meet and turns it into{" "}
            <Highlighter
              action="underline"
              color="#ea4335"
              strokeWidth={2}
              isView
            >
              ready-to-send drafts
            </Highlighter>
            . The AI proposes, you dispose — nothing leaves your hands without
            a click.
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="mt-10 flex justify-center">
            <Link href="/login" className="inline-block">
              <HoverBorderGradient
                as="span"
                className="flex items-center gap-2 px-7 py-3 text-base font-medium"
              >
                Get Started
                <span aria-hidden>→</span>
              </HoverBorderGradient>
            </Link>
          </div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p className="mt-5 text-xs text-ink-faint">
            No audio recording. No live sending. You review every draft.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features — now lives in <FeaturesSection/> (marketing/).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Closing CTA
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
