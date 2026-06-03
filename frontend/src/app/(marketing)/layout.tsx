import type { ReactNode } from "react";

import { SiteNavbar } from "@/components/marketing/SiteNavbar";

/**
 * Public marketing shell — a floating, scroll-aware navbar on top, footer with
 * copyright at the bottom. Polished landing content lives under
 * `(marketing)/page.tsx`. Keep this shell minimal so the page's own sections
 * own their backgrounds and spacing.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <SiteNavbar />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-6 text-sm text-ink-muted">
          <span>© {new Date().getFullYear()} MeetPilot</span>
          <a
            href="https://github.com/harshcodesss/MeetPilot"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink transition-colors"
          >
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
