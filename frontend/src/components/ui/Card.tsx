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
  // Raised cards sit on the white page background — surface (#F8F9FA) is the
  // muted alternative used for nested/flat groupings inside another Card.
  const surface =
    variant === "raised" ? "bg-white shadow-soft" : "bg-surface";
  return (
    <div
      {...rest}
      className={`rounded-xl border border-line p-6 ${surface} ${className}`}
    >
      {children}
    </div>
  );
}
