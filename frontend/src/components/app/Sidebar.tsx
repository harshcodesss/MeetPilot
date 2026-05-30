"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearToken } from "@/lib/auth";

/**
 * Phase 1 placeholder sidebar. Real polish (icons, collapsed state,
 * active-section grouping) lands in Phase 3 alongside TaskCard.
 *
 * Active state uses primary-tint background + primary text — the brief's
 * "active nav" rule. Hover uses surface (#F8F9FA), neutral gray, so the
 * tinted blue stays unique to the active item.
 */
const TOP_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meetings", label: "Meetings" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

function isActive(pathname: string, href: string) {
  // Dashboard is the only exact match; the rest match prefix so
  // /meetings/<id> still highlights the Meetings tab.
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function onLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-8 px-2 text-lg font-semibold text-primary"
      >
        MeetPilot
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {TOP_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              isActive(pathname, item.href)
                ? "bg-primary-tint font-medium text-primary"
                : "text-ink-muted hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
        {BOTTOM_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              isActive(pathname, item.href)
                ? "bg-primary-tint font-medium text-primary"
                : "text-ink-muted hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={onLogout}
          className="rounded-xl px-3 py-2 text-left text-sm text-ink-muted hover:bg-white transition-colors"
        >
          Log out
        </button>
      </nav>
    </aside>
  );
}
