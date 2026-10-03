// Time-zone helpers. Tours are scheduled in local (Miami) time, stored in UTC.

export const TIME_ZONE = "America/New_York";

const partsFormatter = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = partsFormatter.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatter.set(tz, f);
  }
  return f;
}

// Local wall-clock parts for a UTC timestamp.
export function localParts(ms: number, tz = TIME_ZONE) {
  const p: Record<string, number> = {};
  for (const { type, value } of formatter(tz).formatToParts(new Date(ms))) {
    if (type !== "literal") p[type] = Number(value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

// Offset of the time zone from UTC at a moment, in milliseconds.
function offsetAt(ms: number, tz: string) {
  const p = localParts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// UTC timestamp for a local date ("YYYY-MM-DD") plus minutes after local
// midnight. Minutes may go past 1440 (e.g. a midnight start = 1440).
export function localToUtc(date: string, minutes: number, tz = TIME_ZONE): number {
  const [y, m, d] = date.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d) + minutes * 60_000;
  let utc = naive - offsetAt(naive, tz);
  // Re-check once in case the guess crossed a daylight-saving change.
  const corrected = naive - offsetAt(utc, tz);
  if (corrected !== utc) utc = corrected;
  return utc;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Today's date in the local time zone, as "YYYY-MM-DD".
export function localDate(ms: number, tz = TIME_ZONE): string {
  const p = localParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

// "08:30" -> 510. Returns NaN for bad input.
export function parseClock(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return NaN;
  return h * 60 + min;
}

// 1095 -> "6:15 PM" (local clock time of a UTC timestamp)
export function formatTime(ms: number, tz = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

export function formatDate(ms: number, tz = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(ms)
  );
}
