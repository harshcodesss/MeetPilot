import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** `flat` skips the shadow — for inline groupings inside another Card. */
  variant?: "raised" | "flat";
}

export function Card({
  children,
  variant = "raised",
  className = "",
  ...rest
}: CardProps) {
  const elevation =
    variant === "raised" ? "shadow-soft bg-white" : "bg-surface-50";
  return (
    <div
      {...rest}
      className={`rounded-xl border border-surface-200 p-6 ${elevation} ${className}`}
    >
      {children}
    </div>
  );
}
