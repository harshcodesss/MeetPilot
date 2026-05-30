import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// Focus rings use primary-tint (#E8F0FE) — the same blue tint that paints
// the sidebar's active-nav background. Matches the brief's "focus halo".
const FIELD_BASE =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint";

export function Input({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${FIELD_BASE} ${className}`} />;
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${FIELD_BASE} ${className}`} />;
}
