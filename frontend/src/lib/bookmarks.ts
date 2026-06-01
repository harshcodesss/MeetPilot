/**
 * Meeting bookmarks — a frontend-only feature backed by localStorage. There is
 * no backend column for this; it's a per-browser convenience list keyed by
 * `session_id`. (If this needs to follow the user across devices later, it
 * graduates to a `bookmarked` flag on the sessions row.)
 */

const BOOKMARKS_KEY = "meetpilot_bookmarks";

export function loadBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode / quota) — bookmarks just won't
    // persist this session. Non-fatal.
  }
}
