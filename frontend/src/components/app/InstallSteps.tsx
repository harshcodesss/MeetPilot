"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Archive,
  Check,
  Copy,
  Download,
  KeyRound,
  MousePointer2,
  Puzzle,
  ToggleRight,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * The Extension page's install + connect guide, expressed entirely as boxes:
 * four connected step cards (download → open extensions → enable dev mode →
 * load unpacked) plus a fifth "alternative" card carrying the manual pairing
 * code for when the popup auto-connect won't cooperate. The download button,
 * the chrome:// link, and the pairing code all live inside their boxes; steps
 * three and four carry small looping animations. Card + dashed-arrow design
 * follows the marketing how-it-works cards and the arrow_connection reference.
 */
const STEPS: { icon: LucideIcon; title: string; body: ReactNode }[] = [
  {
    icon: Archive,
    title: "Download & unzip",
    body: (
      <>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Grab the build, then unzip it into a folder you’ll keep around.
        </p>
        <DownloadButton />
      </>
    ),
  },
  {
    icon: Puzzle,
    title: "Open extensions",
    body: (
      <>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Paste this into your Chrome address bar and press enter.
        </p>
        <CopyField value="chrome://extensions" />
      </>
    ),
  },
  {
    icon: ToggleRight,
    title: "Enable Developer mode",
    body: (
      <>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Flip the toggle in the top-right corner of the page.
        </p>
        <ToggleAnim />
      </>
    ),
  },
  {
    icon: Upload,
    title: "Load unpacked",
    body: (
      <>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Click Load unpacked and pick the folder you just unzipped.
        </p>
        <LoadUnpackedAnim />
      </>
    ),
  },
];

export function InstallSteps() {
  return (
    <section>
      <h2 className="text-base font-medium text-ink">How to install</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Four quick steps — about a minute, start to finish.
      </p>

      {/* Desktop — a single row joined by dashed arrow connectors. */}
      <div className="mt-5 hidden items-stretch lg:flex">
        {STEPS.map((step, i) => (
          <div key={step.title} className="contents">
            <StepCard step={i + 1} icon={step.icon} title={step.title} className="flex-1">
              {step.body}
            </StepCard>
            {i < STEPS.length - 1 ? <Connector /> : null}
          </div>
        ))}
      </div>

      {/* Tablet / mobile — stacked grid, no connectors. */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:hidden">
        {STEPS.map((step, i) => (
          <StepCard key={step.title} step={i + 1} icon={step.icon} title={step.title}>
            {step.body}
          </StepCard>
        ))}
      </div>

      {/* Box 5 — the alternative path: pair manually with a code. */}
      <PairingBox />
    </section>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  children,
  className = "",
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-line bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          Step {step}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-1.5 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Box contents — download, copy field, pairing code
// ---------------------------------------------------------------------------

function DownloadButton() {
  return (
    <a
      href={`${API_BASE_URL}/static/meetpilot-extension.zip`}
      download
      className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
    >
      <Download className="h-4 w-4" />
      Download (.zip)
    </a>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable on non-HTTPS / older browsers — the value
      // is still visible for manual selection.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="mt-auto flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:bg-white"
    >
      <code className="truncate text-xs text-ink">{value}</code>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-green" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
      )}
    </button>
  );
}

function PairingBox() {
  const [copied, setCopied] = useState(false);
  const bearer = getToken();

  async function copy() {
    if (!bearer) return;
    try {
      await navigator.clipboard.writeText(bearer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fall back silently — the code is shown for manual select.
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-muted shadow-sm">
          <KeyRound className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">
              Having trouble connecting?
            </h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint shadow-sm">
              Alternative
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Pair manually: copy this code and paste it into the extension
            popup’s token box.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <code className="block flex-1 break-all rounded-lg border border-line bg-white p-3 text-xs text-ink">
          {bearer ?? "(sign in to see your pairing code)"}
        </code>
        <button
          type="button"
          onClick={copy}
          disabled={!bearer}
          className="shrink-0 rounded-md border border-line bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Little animations for steps 3 + 4
// ---------------------------------------------------------------------------

// Step 3 — a developer-mode switch flipping on and off, on a loop.
function ToggleAnim() {
  const timing = {
    duration: 2.6,
    repeat: Infinity,
    times: [0, 0.35, 0.85, 1],
    ease: "easeInOut" as const,
  };
  return (
    <div className="mt-auto flex items-center gap-2.5">
      <motion.span
        className="relative inline-flex h-6 w-11 items-center rounded-full px-0.5"
        animate={{ backgroundColor: ["#dadce0", "#1a73e8", "#1a73e8", "#dadce0"] }}
        transition={timing}
      >
        <motion.span
          className="h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: [0, 20, 20, 0] }}
          transition={timing}
        />
      </motion.span>
      <span className="text-xs font-medium text-ink-muted">Developer mode</span>
    </div>
  );
}

// Step 4 — a "Load unpacked" button being tapped by a cursor, on a loop.
function LoadUnpackedAnim() {
  const timing = { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <div className="relative mt-auto inline-flex w-fit">
      <motion.span
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm"
        animate={{ scale: [1, 1, 0.94, 1, 1] }}
        transition={{ ...timing, times: [0, 0.45, 0.55, 0.65, 1] }}
      >
        <Upload className="h-3.5 w-3.5" />
        Load unpacked
      </motion.span>
      <motion.span
        className="pointer-events-none absolute -bottom-1.5 right-3 text-ink"
        animate={{ y: [4, -1, 4], rotate: [-8, 0, -8] }}
        transition={timing}
      >
        <MousePointer2 className="h-4 w-4 fill-ink" />
      </motion.span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashed horizontal connector with an arrowhead — joins adjacent step cards.
// ---------------------------------------------------------------------------

function Connector() {
  return (
    <div className="flex w-12 shrink-0 items-center justify-center">
      <svg width="44" height="16" viewBox="0 0 44 16" fill="none" className="text-ink-faint" aria-hidden>
        <path
          d="M2 8H35"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
        <path
          d="M31 3l8 5-8 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
