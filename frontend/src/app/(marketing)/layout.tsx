import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Public marketing shell — top nav with "Sign in" CTA, footer with copyright.
 * Polished landing content lives under `(marketing)/page.tsx` and gets the
 * real polish in Phase 11. This shell is the surface that landing uses; keep
 * it minimal so adding hero/features sections later doesn't fight the shell.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-surface-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-brand-600">
            MeetPilot
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-brand-600 transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-surface-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-surface-500">
          © {new Date().getFullYear()} MeetPilot
        </div>
      </footer>
    </div>
  );
}
