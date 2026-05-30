import { Badge } from "@/components/ui/Badge";
import type { Confidence } from "@/types";

/**
 * Small pill rendering the LLM's per-task confidence (high / moderate / low).
 *
 * Mirrors the brief's two-layer trust model: `placement` gates whether the
 * task appears at all; `confidence` is the at-a-glance signal that says
 * "trust it" vs "glance at it" vs "review it" on main-list cards. Hidden on
 * suggested-placement cards until the user promotes them (Critical Read 3:
 * confidence is irrelevant before "is this a real task?" is answered).
 *
 * Color discipline (brief): green / yellow / red are RESERVED for confidence
 * (+ status) semantics. Badge tones success/warn/danger map 1:1 here and
 * use the brief's exact Google Meet hexes; yellow uses the darker AA-safe
 * `yellow-text` color so it stays readable on white backgrounds.
 */
const TONE_BY_CONFIDENCE = {
  high: "success",
  moderate: "warn",
  low: "danger",
} as const;

const LABEL_BY_CONFIDENCE: Record<Confidence, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Review",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <Badge tone={TONE_BY_CONFIDENCE[confidence]}>{LABEL_BY_CONFIDENCE[confidence]}</Badge>;
}
