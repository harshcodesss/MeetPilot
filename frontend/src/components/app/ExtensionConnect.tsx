"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * Surfaces the extension download + install steps + the one-click bearer
 * handoff. Lives on the Dashboard (Phase 6) and on Settings (Phase 10) —
 * same component on both surfaces.
 *
 * The "Connect to my account" button is Decision 2's path (a):
 * `chrome.runtime.sendMessage(EXTENSION_ID, { type: "TOKEN", token })`. The
 * extension's service-worker registers `chrome.runtime.onMessageExternal` and
 * accepts the token if it matches the 64-char hex shape, then writes it to
 * `chrome.storage.local` — the popup auto-detects via the existing
 * `storage.local.onChanged` listener and flips out of paste-token mode.
 *
 * Decision 2's path (c) — "Show pairing code" — sits underneath as a soft
 * fallback. Reveals the bearer in a copyable code block so the user can
 * paste it into the popup if the auto-connect fights us (e.g. older Chrome,
 * extension not yet installed, dev-mode ID mismatch).
 */

// Stable across reloads as long as the unpacked-extension folder doesn't move.
// Phase 11 / Web Store publishing later pins this with a `key` field in
// manifest.json so the ID becomes deterministic from a checked-in pubkey.
const EXTENSION_ID = "mnldlilfheapjencpddnhanaffhfajpc";

// ---------------------------------------------------------------------------
// Minimal `chrome.runtime` type declarations — avoids pulling in @types/chrome
// for one call site. If we end up touching chrome.* in more places later,
// install the package and remove this block.
// ---------------------------------------------------------------------------
interface ChromeRuntime {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback?: (response: unknown) => void,
  ) => void;
  lastError?: { message: string };
}
interface ChromeGlobal {
  runtime?: ChromeRuntime;
}
declare global {
  interface Window {
    chrome?: ChromeGlobal;
  }
}

type ConnectStatus =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "failed"; message: string };

export function ExtensionConnect() {
  const [status, setStatus] = useState<ConnectStatus>({ kind: "idle" });
  const [showPairing, setShowPairing] = useState(false);
  const [copied, setCopied] = useState(false);

  function onConnect() {
    const token = getToken();
    if (!token) {
      setStatus({ kind: "failed", message: "Sign in first." });
      return;
    }
    const chrome = typeof window !== "undefined" ? window.chrome : undefined;
    if (!chrome?.runtime?.sendMessage) {
      setStatus({
        kind: "failed",
        message: "Use Chrome to connect the extension.",
      });
      return;
    }

    setStatus({ kind: "connecting" });
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: "TOKEN", token },
      (response: unknown) => {
        // chrome.runtime.lastError is set when the extension isn't installed
        // or isn't reachable — checking it inside the callback is the
        // documented way to detect the failure.
        if (chrome.runtime?.lastError) {
          setStatus({
            kind: "failed",
            message:
              "Extension didn’t respond. Make sure it’s installed and try again, or use the pairing code below.",
          });
          return;
        }
        if (isOkResponse(response)) {
          setStatus({ kind: "connected" });
        } else {
          setStatus({
            kind: "failed",
            message:
              "Connection rejected by the extension. Try the pairing code below.",
          });
        }
      },
    );
  }

  async function onCopyPairingCode() {
    const token = getToken();
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in non-HTTPS / older browsers — fall back
      // silently; the code is already shown in the block for manual select.
    }
  }

  const bearer = getToken();

  return (
    <Card>
      <h2 className="text-base font-medium text-ink">Get the extension</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Install the Chrome extension so MeetPilot can capture your Google Meet
        calls automatically.
      </p>

      <a
        href={`${API_BASE_URL}/static/meetpilot-extension.zip`}
        download
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-primary-hover transition-colors"
      >
        Download (.zip)
      </a>

      <details className="mt-4 text-sm text-ink-muted">
        <summary className="cursor-pointer font-medium text-ink">
          How to install
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Unzip the downloaded file.</li>
          <li>
            Open{" "}
            <code className="rounded bg-surface px-1 text-xs">
              chrome://extensions
            </code>
            .
          </li>
          <li>Toggle “Developer mode” on (top-right corner).</li>
          <li>Click “Load unpacked” and pick the unzipped folder.</li>
        </ol>
      </details>

      <div className="mt-4">
        <ConnectButton status={status} onConnect={onConnect} />
        {status.kind === "failed" ? (
          <p className="mt-2 text-xs text-red">{status.message}</p>
        ) : null}
        {status.kind === "connected" ? (
          <p className="mt-2 text-xs text-green">
            Connected. Open the extension popup and click Start Capture on your
            next Meet.
          </p>
        ) : null}
      </div>

      <details
        className="mt-4 text-sm"
        open={showPairing}
        onToggle={(e) => setShowPairing((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">
          Having trouble? Show pairing code
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs text-ink-muted">
            Copy this code and paste it into the extension popup’s token input.
          </p>
          <code className="block break-all rounded-xl border border-line bg-surface p-3 text-xs text-ink">
            {bearer ?? "(sign in to see your pairing code)"}
          </code>
          <button
            type="button"
            onClick={onCopyPairingCode}
            disabled={!bearer}
            className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </details>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ConnectButton — varies its label / state per the connect lifecycle
// ---------------------------------------------------------------------------

function ConnectButton({
  status,
  onConnect,
}: {
  status: ConnectStatus;
  onConnect: () => void;
}) {
  if (status.kind === "connecting") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white opacity-70"
      >
        <Spinner size="sm" />
        Connecting…
      </button>
    );
  }
  if (status.kind === "connected") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex w-full cursor-default items-center justify-center rounded-xl border border-green bg-green-bg px-4 py-2 text-sm font-medium text-green"
      >
        ✓ Connected
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onConnect}
      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-primary-hover transition-colors"
    >
      {status.kind === "failed" ? "Try again" : "Connect to my account"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isOkResponse(response: unknown): boolean {
  return (
    response !== null &&
    typeof response === "object" &&
    "ok" in response &&
    (response as { ok: unknown }).ok === true
  );
}
