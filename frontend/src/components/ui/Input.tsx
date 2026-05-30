import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`}
    />
  );
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder-surface-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${className}`}
    />
  );
}
