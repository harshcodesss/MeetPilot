"use client";

import { useEffect, useState } from "react";
import { animate, motion } from "motion/react";

/**
 * Animated illustration for the "Eight built-in handlers" feature card. The
 * handler logos sit in glowing circles while a blue beam sweeps left to right
 * across them (the agent routing a task to the right tool). Adapted from the
 * Aceternity scanning-line card, re-themed light and wired to our own logos.
 */
const NODES = [
  { slug: "gmail", circle: "h-10 w-10", img: "h-5 w-5", key: "circle-1" },
  { slug: "slack", circle: "h-12 w-12", img: "h-6 w-6", key: "circle-2" },
  {
    slug: "google-calendar",
    circle: "h-16 w-16",
    img: "h-8 w-8",
    key: "circle-3",
  },
  { slug: "jira", circle: "h-12 w-12", img: "h-6 w-6", key: "circle-4" },
  { slug: "notion", circle: "h-10 w-10", img: "h-5 w-5", key: "circle-5" },
];

export function HandlersScanIllo() {
  useEffect(() => {
    const scale = [1, 1.1, 1];
    const transform = [
      "translateY(0px)",
      "translateY(-4px)",
      "translateY(0px)",
    ];
    const sequence = NODES.map((n) => [
      `.${n.key}`,
      { scale, transform },
      { duration: 0.8 },
    ]);

    // @ts-expect-error — motion's sequence typing is looser than this literal.
    const controls = animate(sequence, { repeat: Infinity, repeatDelay: 1 });
    return () => controls.stop();
  }, []);

  return (
    <div className="relative flex h-32 w-full items-center justify-center overflow-hidden">
      <div className="flex flex-row items-center gap-3">
        {NODES.map((n) => (
          <div
            key={n.key}
            className={`${n.key} ${n.circle} flex items-center justify-center rounded-full border border-line bg-white shadow-[0px_8px_16px_-8px_rgba(0,0,0,0.12)]`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/logos/${n.slug}.svg`} alt="" className={n.img} />
          </div>
        ))}
      </div>

      {/* The sweeping beam. */}
      <div className="animate-move absolute inset-y-3 z-40 w-px bg-gradient-to-b from-transparent via-primary to-transparent">
        <div className="absolute -left-10 top-1/2 h-24 w-10 -translate-y-1/2">
          <Sparkles />
        </div>
      </div>
    </div>
  );
}

function Sparkles() {
  // Positions are randomized, so render only after mount — otherwise the
  // SSR markup and the client's first render disagree (hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const rand = () => Math.random();
  return (
    <div className="absolute inset-0">
      {[...Array(10)].map((_, i) => (
        <motion.span
          key={`spark-${i}`}
          animate={{
            top: `calc(${rand() * 100}% + ${rand() * 2 - 1}px)`,
            left: `calc(${rand() * 100}% + ${rand() * 2 - 1}px)`,
            opacity: rand(),
            scale: [1, 1.2, 0],
          }}
          transition={{
            duration: rand() * 2 + 4,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            top: `${rand() * 100}%`,
            left: `${rand() * 100}%`,
            width: "2px",
            height: "2px",
            borderRadius: "50%",
          }}
          className="inline-block bg-primary/70"
        />
      ))}
    </div>
  );
}
