import { Card } from "@/components/ui/Card";
import { API_BASE_URL } from "@/lib/api";

/**
 * Surfaces the extension download + install steps + the locked auto-connect
 * affordance. Lives on the Dashboard (Phase 6) and on Settings (Phase 10) —
 * same component on both surfaces.
 *
 * Download URL points at the BACKEND's `/static/meetpilot-extension.zip`
 * (Phase 0.7 builds the zip via `backend/scripts/make_extension_zip.py`).
 *
 * The "Connect to my account" button is intentionally disabled in v1: the
 * `chrome.runtime.sendMessage` handoff lands in Phase 8. Until then the
 * extension popup's manual paste-token flow stays the only path.
 */
export function ExtensionConnect() {
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

      <div className="mt-4 rounded-xl border border-dashed border-line p-3">
        <button
          type="button"
          disabled
          title="Auto-connect lands in a later update"
          className="w-full cursor-not-allowed rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink-faint"
        >
          Connect to my account
        </button>
        <p className="mt-2 text-xs text-ink-faint">
          Auto-connect coming soon. For now, paste your bearer in the extension
          popup.
        </p>
      </div>
    </Card>
  );
}
