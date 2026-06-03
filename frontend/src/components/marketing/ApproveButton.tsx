"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The "Approve & send" button in the features draft preview. On click it flips
 * to a green "Sent" state, then reverts to blue after a couple of seconds — a
 * tiny taste of the human-approval gate.
 */
export function ApproveButton() {
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  function handleClick() {
    setSent(true);
    clearTimeout(timer.current ?? undefined);
    timer.current = setTimeout(() => setSent(false), 2200);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-300 ${
        sent ? "bg-green" : "bg-primary group-hover:scale-105"
      }`}
    >
      {sent ? (
        <>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M2.5 7.5L5.5 10.5L11.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sent
        </>
      ) : (
        "Approve & send"
      )}
    </button>
  );
}
