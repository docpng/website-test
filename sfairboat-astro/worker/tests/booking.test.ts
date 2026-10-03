// Run with: npm run test:booking
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sunTimes } from "../booking/sun.ts";
import { localToUtc, formatTime, localDate, parseClock } from "../booking/time.ts";
import { slotsFor, checkDate, tooSoon, overlapping } from "../booking/slots.ts";
import { quote, BookingError } from "../booking/pricing.ts";
import { checkSettings, type BookingSettings } from "../booking/settings.ts";

const settings = checkSettings(
  JSON.parse(readFileSync(new URL("../../src/content/booking.json", import.meta.url), "utf8")) as BookingSettings
);
const geo = { lat: 25.76, lng: -80.49 };
const tour = (id: string) => settings.tourTypes.find((t) => t.id === id)!;
const clock = (ms: number) => formatTime(ms);
const minutesOff = (ms: number, date: string, hhmm: string) =>
  Math.abs(ms - localToUtc(date, parseClock(hhmm))) / 60_000;

test("sunrise and sunset match reference times (within 4 minutes)", () => {
  // Solstices: published Miami times, adjusted ~1 min for the dock's longitude.
  // Equinoxes: an independent formula (Wikipedia "sunrise equation").
  const cases: [string, string, string][] = [
    ["2026-06-21", "06:31", "20:16"],
    ["2026-12-21", "07:04", "17:36"],
    ["2026-03-20", "07:27", "19:34"],
    ["2026-09-22", "07:11", "19:20"],
  ];
  for (const [date, rise, set] of cases) {
    const s = sunTimes(date, geo.lat, geo.lng);
    assert.ok(minutesOff(s.sunrise, date, rise) <= 4, `${date} sunrise ${clock(s.sunrise)} vs ${rise}`);
    assert.ok(minutesOff(s.sunset, date, set) <= 4, `${date} sunset ${clock(s.sunset)} vs ${set}`);
  }
});

test("local times convert correctly across daylight saving", () => {
  // 8:00 EST = 13:00 UTC; 8:00 EDT = 12:00 UTC
  assert.equal(new Date(localToUtc("2026-01-15", 480)).toISOString(), "2026-01-15T13:00:00.000Z");
  assert.equal(new Date(localToUtc("2026-07-15", 480)).toISOString(), "2026-07-15T12:00:00.000Z");
  // DST starts 2026-03-08 at 2am; 8am that day is EDT
  assert.equal(new Date(localToUtc("2026-03-08", 480)).toISOString(), "2026-03-08T12:00:00.000Z");
  // DST ends 2026-11-01; 8pm that day is EST
  assert.equal(new Date(localToUtc("2026-11-01", 1200)).toISOString(), "2026-11-02T01:00:00.000Z");
  assert.equal(localDate(Date.parse("2026-07-16T03:30:00Z")), "2026-07-15");
});

test("daytime tours start every 30 minutes from 8:00am to 3:00pm", () => {
  for (const { minutes } of tour("regular").prices) {
    const slots = slotsFor(tour("regular"), minutes, "2026-07-15", geo);
    const times = slots.map((s) => clock(s.start));
    assert.equal(times[0], "8:00 AM");
    assert.equal(times.at(-1), "3:00 PM");
    assert.equal(times.length, 15);
    assert.equal(times[1], "8:30 AM");
    assert.equal(slots.at(-1)!.end - slots.at(-1)!.start, minutes * 60_000); // 3pm tours run past 3pm
  }
});

test("nighttime tours start every 30 minutes from 7:30pm to midnight", () => {
  for (const date of ["2026-07-15", "2026-12-31", "2026-03-08", "2026-11-01"]) {
    const slots = slotsFor(tour("night"), 90, date, geo);
    const times = slots.map((s) => clock(s.start));
    assert.equal(times[0], "7:30 PM", date);
    assert.equal(times.at(-1), "12:00 AM", date);
    assert.equal(times.length, 10, date);
    // the midnight start is the next calendar day
    const next = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10) + 1)).toISOString().slice(0, 10);
    assert.equal(localDate(slots.at(-1)!.start), next, date);
  }
});

test("sunrise tours start 30 min before sunrise; sunset tours end 30 min after sunset", () => {
  const date = "2026-06-21";
  const sun = sunTimes(date, geo.lat, geo.lng);
  const [rise] = slotsFor(tour("sunrise"), 90, date, geo);
  assert.ok(Math.abs(rise.start - (sun.sunrise - 30 * 60_000)) <= 2.5 * 60_000);
  assert.equal(rise.start % (5 * 60_000), 0);
  const [set90] = slotsFor(tour("sunset"), 90, date, geo);
  const [set120] = slotsFor(tour("sunset"), 120, date, geo);
  assert.ok(Math.abs(set90.end - (sun.sunset + 30 * 60_000)) <= 2.5 * 60_000);
  assert.equal(set90.end, set120.end);
  assert.equal(set120.start, set90.start - 30 * 60_000);
});

test("prices: base for 2 guests, $60 per extra guest, up to 7", () => {
  const expected: Record<string, Record<number, number>> = {
    regular: { 60: 250, 90: 350, 120: 450 },
    sunrise: { 90: 450, 120: 550 },
    sunset: { 90: 450, 120: 550 },
    night: { 90: 450, 120: 550 },
  };
  for (const [id, byLen] of Object.entries(expected)) {
    for (const [len, price] of Object.entries(byLen)) {
      assert.equal(quote(settings, id, Number(len), 2).total, price);
      assert.equal(quote(settings, id, Number(len), 1).total, price);
      assert.equal(quote(settings, id, Number(len), 7).total, price + 5 * 60);
    }
  }
  assert.equal(quote(settings, "regular", 60, 3).total, 310);
  assert.throws(() => quote(settings, "regular", 60, 8), BookingError);
  assert.throws(() => quote(settings, "regular", 60, 0), BookingError);
  assert.throws(() => quote(settings, "regular", 60, 2.5), BookingError);
  assert.throws(() => quote(settings, "sunrise", 60, 2), BookingError); // no 1-hour sunrise
  assert.throws(() => quote(settings, "helicopter", 60, 2), BookingError);
});

test("date rules: past, too far ahead, blocked, 24-hour notice", () => {
  const now = Date.parse("2026-07-15T16:00:00Z"); // noon in Miami
  assert.equal(checkDate(settings, "2026-07-14", now).ok, false);
  assert.equal(checkDate(settings, "2026-07-16", now).ok, true);
  assert.equal(checkDate(settings, "2027-07-15", now).ok, true);
  assert.equal(checkDate(settings, "2027-07-16", now).ok, false);
  assert.equal(checkDate(settings, "2026-02-30", now).ok, false);
  const blocked = { ...settings, blockedDates: [{ date: "2026-08-01", note: "Maintenance" }] };
  assert.equal(checkDate(blocked, "2026-08-01", now).ok, false);
  assert.equal(tooSoon(settings, Date.parse("2026-07-16T15:00:00Z"), now), true);
  assert.equal(tooSoon(settings, Date.parse("2026-07-16T16:00:00Z"), now), false);
});

test("capacity: overlapping bookings are counted", () => {
  const h = 3_600_000;
  const booked = [{ start: 10 * h, end: 12 * h }];
  assert.equal(overlapping(booked, 11 * h, 12 * h), 1);
  assert.equal(overlapping(booked, 12 * h, 13 * h), 0); // back-to-back is fine (no buffer)
  assert.equal(overlapping(booked, 9 * h, 10 * h), 0);
  assert.equal(overlapping(booked, 9 * h, 10.5 * h), 1);
});

test("Stripe webhook signatures: valid, tampered, stale, missing", async () => {
  const { signPayload, verifyStripeSignature } = await import("../booking/stripe.ts");
  const secret = "whsec_test";
  const body = '{"type":"checkout.session.completed"}';
  const t = 1_800_000_000;
  const sig = await signPayload(secret, t, body);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, t + 10), true);
  assert.equal(await verifyStripeSignature(body + " ", `t=${t},v1=${sig}`, secret, t + 10), false);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${sig}`, "whsec_other", t + 10), false);
  assert.equal(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, t + 3600), false);
  assert.equal(await verifyStripeSignature(body, null, secret, t), false);
  assert.equal(await verifyStripeSignature(body, `t=${t},v0=${sig}`, secret, t + 10), false);
});
