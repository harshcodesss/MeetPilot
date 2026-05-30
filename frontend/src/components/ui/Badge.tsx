import type { ReactNode } from "react";

/**
 * Tones map to the brief's strict-semantic system:
 *   - neutral: gray chrome — counts, categories, no severity.
 *   - info:    blue (primary-tint) — categories like "Suggested" placement
 *              (NOT severity; deliberately not green/yellow/red).
 *   - success: green — confidence high / "ready" status. Reserved.
 *   - warn:    yellow — confidence moderate / attention. Reserved. Uses the
 *              AA-safe darker `yellow-text` color on the lighter `yellow-bg`.
 *   - danger:  red — confidence low / urgent. Reserved.
 */
type Tone = "neutral" | "info" | "success" | "warn" | "danger";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-surface text-ink-muted border border-line",
  info: "bg-primary-tint text-primary border border-primary-tint",
  success: "bg-green-bg text-green border border-green-bg",
  warn: "bg-yellow-bg text-yellow-text border border-yellow-bg",
  danger: "bg-red-bg text-red border border-red-bg",
};

export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
