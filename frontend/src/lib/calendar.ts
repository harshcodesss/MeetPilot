/**
 * Date helpers for the Calendar page (Phase 9).
 *
 * All operations happen in LOCAL time. The backend's `deadline_date` field
 * is a calendar-day string (YYYY-MM-DD) — there's no time-of-day, so we
 * compare days in the user's local timezone. Constructing `new Date(ymd)`
 * directly parses as UTC midnight which can shift a day across timezones;
 * we use `parseLocalDate` instead.
 */

/** Format a Date as a calendar-day string ("2026-05-31") in LOCAL time. */
export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string as a LOCAL-time Date at midnight. */
export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date at local midnight (for past/today/future comparisons). */
export function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** First day of `date`'s month (year + month preserved, day = 1). */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** `n` months added (can be negative); day-of-month clamped sensibly. */
export function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** Display name for `date`'s month, e.g. "May 2026". */
export function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export interface CalendarCell {
  date: Date;
  ymd: string;
  /** Day-of-month number, 1-31. */
  day: number;
  /** True if this cell belongs to the displayed month (vs leading/trailing). */
  inMonth: boolean;
  /** Position vs today (local). */
  position: "past" | "today" | "future";
}

/**
 * Returns the 6×7=42 cells of the month grid for `displayedMonth`, padded
 * with leading days from the previous month and trailing days from the next
 * month so the grid always renders as a full 6-week block.
 *
 * Week starts on Sunday (matches `Date.prototype.getDay()` returning 0 for
 * Sunday). Day-of-week labels are passed separately at the render site.
 */
export function buildMonthCells(displayedMonth: Date): CalendarCell[] {
  const first = startOfMonth(displayedMonth);
  // Subtract the day-of-week offset so the grid starts on the Sunday on
  // or before the 1st of the displayed month.
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const today = todayLocal();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const inMonth = d.getMonth() === displayedMonth.getMonth();
    const cmp = d.getTime() - today.getTime();
    const position: CalendarCell["position"] =
      cmp < 0 ? "past" : cmp === 0 ? "today" : "future";
    cells.push({
      date: d,
      ymd: formatYmd(d),
      day: d.getDate(),
      inMonth,
      position,
    });
  }
  return cells;
}

/** Group an array of items keyed by `deadline_date` into a map by YMD. */
export function groupByYmd<T extends { deadline_date: string }>(
  items: T[],
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    (map[item.deadline_date] ??= []).push(item);
  }
  return map;
}
