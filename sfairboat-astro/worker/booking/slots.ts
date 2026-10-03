// Start times offered for each tour type on a date, in UTC.
import { sunTimes } from "./sun.ts";
import { localToUtc, parseClock, localDate, addDays, isValidDate } from "./time.ts";
import { blockedDateSet, type BookingSettings, type TourType } from "./settings.ts";

export type Slot = { tourId: string; minutes: number; start: number; end: number };

const FIVE_MIN = 5 * 60_000;
const roundTo5 = (ms: number) => Math.round(ms / FIVE_MIN) * FIVE_MIN;

// All candidate slots for one tour type and length on a local date.
export function slotsFor(tour: TourType, minutes: number, date: string, geo: { lat: number; lng: number }): Slot[] {
  const len = minutes * 60_000;
  if (tour.timing === "sunriseStart") {
    const start = roundTo5(sunTimes(date, geo.lat, geo.lng).sunrise + (tour.sunOffset ?? 0) * 60_000);
    return [{ tourId: tour.id, minutes, start, end: start + len }];
  }
  if (tour.timing === "sunsetEnd") {
    const end = roundTo5(sunTimes(date, geo.lat, geo.lng).sunset + (tour.sunOffset ?? 0) * 60_000);
    return [{ tourId: tour.id, minutes, start: end - len, end }];
  }
  const first = parseClock(tour.firstStart ?? "");
  let last = parseClock(tour.lastStart ?? "");
  const every = Math.max(5, tour.every ?? 30);
  if (Number.isNaN(first) || Number.isNaN(last)) return [];
  if (last < first) last += 1440; // e.g. 00:00 after 19:30 = midnight that night
  const out: Slot[] = [];
  for (let m = first; m <= last; m += every) {
    const start = localToUtc(date, m);
    out.push({ tourId: tour.id, minutes, start, end: start + len });
  }
  return out;
}

export type DateCheck = { ok: true } | { ok: false; reason: string };

// Is this local date open for online booking at all?
export function checkDate(settings: BookingSettings, date: string, now: number): DateCheck {
  if (!isValidDate(date)) return { ok: false, reason: "Pick a valid date." };
  const today = localDate(now);
  if (date < today) return { ok: false, reason: "That date has passed." };
  if (date > addDays(today, settings.maxDaysAhead)) {
    return { ok: false, reason: `Online booking is open up to ${settings.maxDaysAhead} days ahead.` };
  }
  if (blockedDateSet(settings).has(date)) return { ok: false, reason: "We're not running tours that day." };
  return { ok: true };
}

// Starts too soon to book online?
export const tooSoon = (settings: BookingSettings, start: number, now: number) =>
  start < now + settings.minNoticeHours * 3_600_000;

// How many active bookings overlap [start, end)?
export const overlapping = (bookings: { start: number; end: number }[], start: number, end: number) =>
  bookings.filter((b) => b.start < end && b.end > start).length;
