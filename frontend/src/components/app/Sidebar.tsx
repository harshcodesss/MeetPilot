"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearToken } from "@/lib/auth";

/**
 * Phase 1 placeholder sidebar — the brief locks the nav groups but the real
 * polish (icons, collapsed state, active-section grouping) lands in Phase 3
 * alongside TaskCard. For now this is a flat `<aside>` with the locked nav.
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
    <aside className="flex w-56 shrink-0 flex-col border-r border-surface-200 bg-white px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-8 px-2 text-lg font-semibold text-brand-600"
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
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-surface-700 hover:bg-surface-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-auto flex flex-col gap-1 border-t border-surface-200 pt-4">
        {BOTTOM_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              isActive(pathname, item.href)
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-surface-700 hover:bg-surface-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={onLogout}
          className="rounded-xl px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-100 transition-colors"
        >
          Log out
        </button>
      </nav>
    </aside>
  );
}
