import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/**
 * Variants map to the brief's semantics:
 *   - primary: brand action — Google Blue.
 *   - secondary: chrome neutral, line-bordered white.
 *   - ghost: no chrome, hover tint only.
 *   - danger: red — legitimate "urgent/danger" semantic use (sign-out
 *     confirmation, destructive delete). Reserved; do NOT use as a generic
 *     decorative red.
 */
const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:opacity-60",
  secondary:
    "bg-white text-ink border border-line hover:bg-surface disabled:opacity-60",
  ghost:
    "bg-transparent text-ink-muted hover:bg-surface disabled:opacity-60",
  danger:
    "bg-white text-red border border-red-bg hover:bg-red-bg disabled:opacity-60",
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
    >
      {children}
    </button>
  );
}
