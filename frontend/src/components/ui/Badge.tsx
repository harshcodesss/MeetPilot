import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "warn" | "danger";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-surface-100 text-surface-700 border border-surface-200",
  brand: "bg-brand-50 text-brand-700 border border-brand-100",
  warn: "bg-yellow-50 text-yellow-800 border border-yellow-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
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
