import type { ReactNode } from "react";

import { FadeIn } from "@/components/marketing/FadeIn";
import { Dock, DockIcon } from "@/components/ui/dock";
import { Highlighter } from "@/components/ui/highlighter";

/**
 * About — the maker's section before the CTA. A heading, then the builder's
 * photo as a centered avatar with hand-drawn arrows (as in How it works)
 * pointing out to three boxes: About me (left), Contact + Motivation (right).
 */
export function AboutSection() {
  return (
    <section id="about" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <FadeIn y={0}>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Developer
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The{" "}
            <Highlighter action="underline" color="#ea4335" strokeWidth={3} isView>
              mind
            </Highlighter>{" "}
            behind MeetPilot
          </h2>
        </FadeIn>

        {/* Desktop — avatar in the middle, arrows fanning to the boxes. */}
        <div className="mt-16 hidden items-center justify-center gap-3 lg:flex">
          <FadeIn delay={0.15} y={0}>
            <InfoBox {...ABOUT} className="w-72" />
          </FadeIn>
          <Arrow variant="left" className="relative z-10 -mr-6" />
          <FadeIn>
            <Avatar />
          </FadeIn>
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <Arrow variant="up-right" className="relative z-10 -ml-6" />
              <FadeIn delay={0.2} y={0}>
                <InfoBox {...CONTACT} className="w-80" />
              </FadeIn>
            </div>
            <div className="flex items-center gap-4">
              <Arrow variant="down-right" className="relative z-10 -ml-6" />
              <FadeIn delay={0.3} y={0}>
                <InfoBox {...MOTIVATION} className="w-80" />
              </FadeIn>
            </div>
          </div>
        </div>

        {/* Mobile / tablet — avatar on top, boxes stacked below. */}
        <div className="mt-12 flex flex-col items-center gap-8 lg:hidden">
          <FadeIn>
            <Avatar />
          </FadeIn>
          <div className="grid w-full gap-4 sm:grid-cols-3">
            <FadeIn delay={0.1} y={0} className="h-full">
              <InfoBox {...ABOUT} className="h-full" />
            </FadeIn>
            <FadeIn delay={0.2} y={0} className="h-full">
              <InfoBox {...CONTACT} className="h-full" />
            </FadeIn>
            <FadeIn delay={0.3} y={0} className="h-full">
              <InfoBox {...MOTIVATION} className="h-full" />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar() {
  return (
    <div className="aspect-[6/5] w-[22rem] shrink-0 overflow-hidden rounded-3xl bg-gradient-to-b from-primary-tint to-white sm:w-[28rem]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/harsh.png"
        alt="Harsh, the builder of MeetPilot"
        className="h-full w-full object-cover object-top"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Info boxes
// ---------------------------------------------------------------------------

const ABOUT = {
  title: "About me",
  color: "#cfe3ff",
  body: (
    <>
      I’m a developer who likes turning messy, real world problems into clean
      systems. I designed and built MeetPilot end to end: a Manifest V3 Chrome
      extension that reads Google Meet captions, a FastAPI backend with a Redis
      backed worker, a Gemini powered extraction and drafting pipeline, and a
      Next.js dashboard. I care about precision over flash, and about keeping a
      human in control of anything the AI proposes.
    </>
  ),
};

const CONTACT = {
  title: "Contact me",
  color: "#cfe3ff",
  body: (
    <>
      Reach out, I’d love to hear what you think.
      <ContactDock />
    </>
  ),
};

const CONTACT_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/harshrathi",
    src: "/logos/linkedin.svg",
  },
  {
    label: "GitHub",
    href: "https://github.com/harshcodesss",
    src: "/logos/github.svg",
  },
  {
    label: "Gmail",
    href: "mailto:harshmessi558@gmail.com",
    src: "/logos/gmail.svg",
  },
];

function ContactDock() {
  return (
    <Dock
      className="mx-0 mt-3 border-line bg-surface"
      iconSize={40}
      iconMagnification={72}
      iconDistance={80}
    >
      {CONTACT_LINKS.map((l) => (
        <DockIcon
          key={l.label}
          className="group/icon border border-line bg-white shadow-sm transition-colors hover:bg-neutral-100"
        >
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.label}
            className="relative flex h-full w-full items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={l.src}
              alt={l.label}
              className="h-full w-full object-contain"
            />
            {/* Label tooltip on hover. */}
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-md transition-all duration-200 group-hover/icon:translate-y-0 group-hover/icon:opacity-100">
              {l.label}
            </span>
          </a>
        </DockIcon>
      ))}
    </Dock>
  );
}

const MOTIVATION = {
  title: "Motivation",
  color: "#cfe3ff",
  body: (
    <>
      People forget what they agree to in meetings. I built MeetPilot so every
      commitment is captured automatically and the follow up is ready to send.
    </>
  ),
};

function InfoBox({
  title,
  body,
  color = "#cfe3ff",
  className = "",
}: {
  title: string;
  body: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-base font-semibold text-ink">
        <Highlighter action="highlight" color={color} isView>
          {title}
        </Highlighter>
      </h3>
      <div className="mt-4 text-sm leading-relaxed text-ink-muted">{body}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hand-drawn connector arrows
// ---------------------------------------------------------------------------

function Arrow({
  variant,
  className = "",
}: {
  variant: "left" | "up-right" | "down-right";
  className?: string;
}) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  const cls = `text-ink-faint ${className}`;
  if (variant === "left") {
    return (
      <svg width="92" height="32" viewBox="0 0 92 32" className={cls} aria-hidden>
        <path d="M88 10C58 8 28 20 9 20" {...common} />
        <path d="M17 14 9 20 17 26" {...common} />
      </svg>
    );
  }
  if (variant === "up-right") {
    return (
      <svg width="92" height="40" viewBox="0 0 92 40" className={cls} aria-hidden>
        <path d="M4 32C34 36 66 28 84 10" {...common} />
        <path d="M73 9 84 10 82 21" {...common} />
      </svg>
    );
  }
  return (
    <svg width="92" height="40" viewBox="0 0 92 40" className={cls} aria-hidden>
      <path d="M4 8C34 4 66 12 84 30" {...common} />
      <path d="M73 31 84 30 82 19" {...common} />
    </svg>
  );
}

