"use client";

import { useEffect, useState, type ReactNode } from "react";

import { CaptureScene } from "@/components/auth/CaptureScene";
import { ExtractionScene } from "@/components/auth/ExtractionScene";
import { AutomationScene } from "@/components/auth/AutomationScene";

/**
 * The right-hand showcase on the login page — a three-slide auto-advancing
 * carousel mirroring the product's three subsystems: Capture → Extraction →
 * Automation. Each slide is a solid brand color; slides may also carry an
 * animated `scene` that floats above the caption. Capture is built; Extraction
 * and Automation scenes follow.
 */
type Slide = {
  id: string;
  step: string;
  label: string;
  title: string;
  subtitle: string;
  color: string;
  scene?: ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: "capture",
    step: "01",
    label: "Capture",
    title: "Captured as it happens",
    subtitle: "Every line of your Meet, in order — no recording, no setup.",
    color: "#1a73e8", // blue
    scene: <CaptureScene />,
  },
  {
    id: "extraction",
    step: "02",
    label: "Extraction",
    title: "Turned into action items",
    subtitle: "Who owes what, by when — pulled out automatically.",
    color: "#ea4335", // red
    scene: <ExtractionScene />,
  },
  {
    id: "automation",
    step: "03",
    label: "Automation",
    title: "Drafted, ready to send",
    subtitle: "Emails, events and tickets — one click to approve.",
    color: "#34a853", // green
    scene: <AutomationScene />,
  },
];

const ADVANCE_MS = 10000;

export function LoginCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setActive((a) => (a + 1) % SLIDES.length),
      ADVANCE_MS,
    );
    return () => clearInterval(timer);
  }, []);

  const current = SLIDES[active];

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Slides — cross-fade between them. */}
      {SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0" style={{ backgroundColor: slide.color }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Animated illustration for this slide, floating above the caption. */}
          {slide.scene && (
            <div className="absolute inset-x-0 top-0 bottom-48 flex items-center justify-center px-10">
              {slide.scene}
            </div>
          )}
        </div>
      ))}

      {/* Caption + controls for the active slide. */}
      <div className="absolute inset-x-0 bottom-0 p-10 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          {current.step} — {current.label}
        </p>
        <h2 className="mt-3 max-w-sm text-[28px] font-semibold leading-tight">
          {current.title}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/80">
          {current.subtitle}
        </p>

        <div className="mt-7 flex gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${slide.label}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-9 bg-white" : "w-5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
