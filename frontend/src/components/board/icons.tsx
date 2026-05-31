import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function ChevronRightIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoreHorizontalIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" {...p}>
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  );
}

// "Has a draft" — used for drafted tasks. Subtle document.
export function DocumentIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M4 2.5h5L12 5.5v8a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9 2.5V6h3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// "Needs your input" — used for awaiting_answers tasks.
export function ExclamationIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 4.5v4M8 11.25v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// "Idea / could be a task" — used for suggested tasks.
export function LightbulbIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M8 2.5a4 4 0 00-2.4 7.2V11a.8.8 0 00.8.8h3.2a.8.8 0 00.8-.8V9.7A4 4 0 008 2.5z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M6.5 13.5h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// "Done" — used for completed tasks.
export function CheckIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M3.5 8.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Back arrow — used on the task detail page header.
export function ArrowLeftIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M10 13L5 8l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Per-column sort arrows.
export function ArrowUpIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M8 12V4M5 7l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowDownIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M8 4v8M5 9l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Funnel filter icon — three horizontal lines descending in width.
// Used in the board header as the affordance for the sort selector.
export function FilterIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M2 4h12M4 8h8M6 12h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ===========================================================================
// Column-header badge icons — bigger / coloured / filled, distinct from the
// thin line-style status icons used inside cards.
// ===========================================================================

// Drafted column — neutral document.
export function HeaderDocumentIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <path
        d="M4 2.5h5L12 5.5v8a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5z"
        fill="#e5e7eb"
        stroke="#6b7280"
        strokeWidth="1"
      />
      <path d="M9 2.5V6h3" stroke="#6b7280" strokeWidth="1" fill="none" />
      <path
        d="M5.5 9h5M5.5 11h3.5"
        stroke="#6b7280"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Need Answers column — red filled circle with a white exclamation.
export function HeaderAlertIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" {...p}>
      <circle cx="8" cy="8" r="7" fill="#ef4444" />
      <path
        d="M8 4v4.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.25" r="0.85" fill="white" />
    </svg>
  );
}

// Suggestions column — filled yellow lightbulb.
export function HeaderBulbIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" {...p}>
      <path
        d="M8 2a4 4 0 00-2.4 7.2V11a.8.8 0 00.8.8h3.2a.8.8 0 00.8-.8V9.2A4 4 0 008 2z"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="0.7"
      />
      <path
        d="M6.5 13.5h3"
        stroke="#a16207"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Completed column — green filled circle with a white check.
export function HeaderCheckIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" {...p}>
      <circle cx="8" cy="8" r="7" fill="#22c55e" />
      <path
        d="M4.5 8.5l2.5 2.5 4.5-5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Workspace badge — the green "M" tile in the active pill.
export function WorkspaceBadge(p: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...p}>
      <rect width="16" height="16" rx="4" fill="currentColor" />
      <path
        d="M4.5 11.5V5l3 4 3-4v6.5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
