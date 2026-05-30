"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  /** Stagger when used in sequence with sibling FadeIns. Seconds. */
  delay?: number;
  /** Per-item vertical offset before fade-in. Tweak for taller hero sections. */
  y?: number;
  className?: string;
}

/**
 * Scroll-driven fade-up. Fires once per element as it enters the viewport
 * (within a 100px margin so it's already lifting before fully visible).
 *
 * Framer Motion is allowed ONLY on the landing (Phase 11 brief lock). Don't
 * import this component from anything under `(app)/` — keep app surfaces
 * snappy and JS-free where possible.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 20,
  className,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
