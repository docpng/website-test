// Shape of src/content/booking.json (edited in the site editor) and checks.

export type Timing = "fixed" | "sunriseStart" | "sunsetEnd";

export type TourType = {
  id: string;
  label: string;
  description?: string;
  timing: Timing;
  firstStart?: string; // "08:00" (fixed timing)
  lastStart?: string; // "15:00"; earlier than firstStart means the next day (e.g. "00:00")
  every?: number; // minutes between start times (fixed timing)
  sunOffset?: number; // minutes from sunrise (start) or sunset (end)
  prices: { minutes: number; price: number }[];
};

export type BookingSettings = {
  enabled: boolean;
  tourTypes: TourType[];
  includedGuests: number;
  extraGuestPrice: number;
  maxGuests: number;
  boats: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  blockedDates: (string | { date: string; note?: string })[];
  policy?: string;
  ownerEmail?: string;
};

export function blockedDateSet(settings: BookingSettings): Set<string> {
  return new Set(
    (settings.blockedDates ?? [])
      .map((b) => (typeof b === "string" ? b : b?.date))
      .filter((d): d is string => typeof d === "string")
      .map((d) => d.slice(0, 10))
  );
}

// Throws a readable error for settings that would break booking.
export function checkSettings(s: BookingSettings): BookingSettings {
  const fail = (msg: string) => {
    throw new Error(`Booking settings (src/content/booking.json): ${msg}`);
  };
  if (!Array.isArray(s.tourTypes) || s.tourTypes.length === 0) fail("add at least one tour type.");
  const ids = new Set<string>();
  for (const t of s.tourTypes) {
    if (!t.id || !/^[a-z0-9-]+$/.test(t.id)) fail(`tour type "${t.label}" needs an id of lowercase letters/dashes.`);
    if (ids.has(t.id)) fail(`two tour types use the id "${t.id}".`);
    ids.add(t.id);
    if (!["fixed", "sunriseStart", "sunsetEnd"].includes(t.timing)) fail(`"${t.label}" has an unknown timing "${t.timing}".`);
    if (t.timing === "fixed" && !(/^\d{1,2}:\d{2}$/.test(t.firstStart ?? "") && /^\d{1,2}:\d{2}$/.test(t.lastStart ?? "")))
      fail(`"${t.label}" needs first and last start times like 08:00.`);
    if (!t.prices?.length) fail(`"${t.label}" needs at least one length and price.`);
    for (const p of t.prices) {
      if (!(p.minutes > 0 && p.minutes <= 600)) fail(`"${t.label}" has a tour length of ${p.minutes} minutes.`);
      if (!(p.price > 0)) fail(`"${t.label}" has a price of ${p.price}.`);
    }
  }
  if (!(s.boats >= 1)) fail("boats must be at least 1.");
  if (!(s.maxGuests >= 1 && s.includedGuests >= 1)) fail("guest numbers must be at least 1.");
  return s;
}
