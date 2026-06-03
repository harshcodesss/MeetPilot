"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Demo screen — a macOS-style window holding a preview of the MeetPilot
 * dashboard. It peeks ~10–15% up from under the hero, then scales to full
 * size as it scrolls into view (scroll-linked scale, framer-motion).
 *
 * The inner <DashboardMock/> is a placeholder: swap it for a real screenshot
 * (<img>) or a looping <video src=... autoPlay loop muted playsInline /> once
 * we have the asset — keep the same aspect ratio so the frame doesn't jump.
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

          {/* Swap this for a screenshot or demo video later. */}
          <DashboardMock />
        </div>
      </motion.div>
    </section>
  );
}

const TASKS = [
  {
    dot: "bg-green",
    action: "Send the Q3 deck to the team",
    who: "Priya",
    due: "Fri, Jun 6",
    handler: "Gmail",
  },
  {
    dot: "bg-yellow",
    action: "Schedule the design review",
    who: "Aman",
    due: "Next week",
    handler: "Calendar",
  },
  {
    dot: "bg-red",
    action: "Confirm the vendor budget",
    who: "Unassigned",
    due: "—",
    handler: "Jira",
  },
];

function DashboardMock() {
  return (
    <div className="flex aspect-[16/10] w-full bg-white">
      {/* Sidebar */}
      <aside className="hidden w-44 flex-col gap-1 border-r border-line bg-surface p-4 sm:flex">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-xs font-semibold text-white">
            M
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink">
            MeetPilot
          </span>
        </div>
        <span className="rounded-lg bg-primary-tint px-3 py-2 text-sm font-medium text-primary">
          Dashboard
        </span>
        <span className="px-3 py-2 text-sm text-ink-muted">Meetings</span>
        <span className="px-3 py-2 text-sm text-ink-muted">Settings</span>
      </aside>

      {/* Main */}
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink sm:text-lg">
            Action items
          </h3>
          <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-medium text-primary">
            3 to review
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Weekly sync · {TASKS.length} tasks extracted
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {TASKS.map((t) => (
            <div
              key={t.action}
              className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {t.action}
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {t.who} · {t.due}
                </p>
              </div>
              <span className="hidden shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted sm:inline">
                {t.handler}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
