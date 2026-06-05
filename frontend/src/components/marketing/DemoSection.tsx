"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Demo screen — a macOS-style window holding a preview of the MeetPilot
 * dashboard. It peeks ~10–15% up from under the hero, then scales to full
 * size as it scrolls into view (scroll-linked scale, framer-motion).
 *
 * Holds the real dashboard screenshot (/Dashboard.png) at its native aspect
 * ratio. Swap the <img> for a looping <video> later if we record a demo —
 * keep the same aspect ratio so the frame doesn't jump.
 */
export function DemoSection() {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    // ~10% visible at the start (top at 90% of viewport), full by 25%.
    offset: ["start 90%", "start 25%"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);

  return (
    <section
      id="demo"
      ref={containerRef}
      className="relative -mt-12 flex flex-col items-center overflow-hidden bg-white pt-2 pb-28"
    >
      {/* Floating window frame. */}
      <motion.div
        style={{ scale }}
        className="relative z-10 w-[92%] max-w-6xl rounded-2xl border border-line bg-surface p-2 shadow-2xl md:p-3"
      >
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-inner">
          {/* macOS window header */}
          <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red" />
              <span className="h-3 w-3 rounded-full bg-yellow" />
              <span className="h-3 w-3 rounded-full bg-green" />
            </div>
            <div className="mx-auto hidden h-6 items-center rounded-md border border-line bg-white px-20 text-xs text-ink-faint md:flex">
              app.meetpilot.com/dashboard
            </div>
            <div className="hidden w-12 md:block" />
          </div>

          {/* Real dashboard screenshot. */}
          <img
            src="/Dashboard.png"
            alt="MeetPilot dashboard"
            className="aspect-[2932/1514] w-full object-cover"
          />
        </div>
      </motion.div>
    </section>
  );
}

