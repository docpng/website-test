// Booking API routes (see worker/index.ts):
//   GET  /api/booking/availability?date=YYYY-MM-DD
//   POST /api/booking/checkout        -> Stripe Checkout URL
//   POST /api/booking/release         -> frees a hold when the guest backs out of checkout
//   GET  /api/booking/status?session_id=...
//   POST /api/stripe/webhook
//   GET  /api/admin/bookings, POST /api/admin/bookings/cancel  (GitHub sign-in)
import { quote, BookingError } from "./pricing.ts";
import { slotsFor, checkDate, tooSoon, overlapping } from "./slots.ts";
import { formatDate, formatTime, localDate } from "./time.ts";
import type { BookingSettings } from "./settings.ts";
import * as db from "./db.ts";
import { createCheckoutSession, getCheckoutSession, expireCheckoutSession, verifyStripeSignature, type StripeEnv } from "./stripe.ts";

export type BookingEnv = StripeEnv & {
  DB?: db.D1Like;
  STRIPE_WEBHOOK_SECRET?: string;
  ADMIN_REPO?: string; // GitHub repo whose writers may see bookings (default docpng/website-test)
  GITHUB_API_BASE?: string; // for local testing only
};

export type BookingContext = {
  settings: BookingSettings;
  geo: { lat: number; lng: number };
  business: { name: string; phone: string };
  now?: () => number;
};

const HOLD_MINUTES = 30;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
const fail = (message: string, status = 400) => json({ error: message }, status);

const fillPolicy = (ctx: BookingContext) =>
  (ctx.settings.policy ?? "").replaceAll("{phone}", ctx.business.phone).replaceAll("{businessName}", ctx.business.name);

function requireDb(env: BookingEnv): db.D1Like {
  if (!env.DB) throw new BookingError("Online booking isn't set up yet. Please call us to book.", 503);
  return env.DB;
}

// ----------------------------------------------------------------- availability
async function availability(url: URL, env: BookingEnv, ctx: BookingContext) {
  const { settings } = ctx;
  const now = ctx.now?.() ?? Date.now();
  const date = url.searchParams.get("date") ?? "";
  const base = {
    date,
    enabled: settings.enabled,
    includedGuests: settings.includedGuests,
    extraGuestPrice: settings.extraGuestPrice,
    maxGuests: settings.maxGuests,
    minNoticeHours: settings.minNoticeHours,
    firstDate: localDate(now),
    maxDaysAhead: settings.maxDaysAhead,
    policy: fillPolicy(ctx),
  };
  if (!settings.enabled) return json({ ...base, closed: "Online booking is paused. Please call us to book.", tours: [] });
  const check = checkDate(settings, date, now);
  if (!check.ok) return json({ ...base, closed: check.reason, tours: [] });

  // Every candidate slot for the date, then one query for bookings in that span.
  const tours = settings.tourTypes.map((tour) => ({
    tour,
    options: tour.prices.map((p) => ({ ...p, slots: slotsFor(tour, p.minutes, date, ctx.geo) })),
  }));
  const all = tours.flatMap((t) => t.options.flatMap((o) => o.slots));
  let active: { start: number; end: number }[] = [];
  if (all.length && env.DB) {
    await db.ensureSchema(env.DB);
    active = await db.activeBetween(
      env.DB,
      Math.min(...all.map((s) => s.start)),
      Math.max(...all.map((s) => s.end)),
      now
    );
  }
  return json({
    ...base,
    bookingReady: Boolean(env.DB && env.STRIPE_SECRET_KEY),
    tours: tours.map(({ tour, options }) => ({
      id: tour.id,
      label: tour.label,
      description: tour.description ?? "",
      timing: tour.timing,
      options: options.map((o) => ({
        minutes: o.minutes,
        price: o.price,
        slots: o.slots.map((s) => ({
          start: s.start,
          end: s.end,
          time: formatTime(s.start),
          endTime: formatTime(s.end),
          available: !tooSoon(settings, s.start, now) && overlapping(active, s.start, s.end) < settings.boats,
          reason: tooSoon(settings, s.start, now) ? "too-soon" : overlapping(active, s.start, s.end) >= settings.boats ? "booked" : "",
        })),
      })),
    })),
  });
}

// ----------------------------------------------------------------- checkout
type CheckoutBody = {
  date?: string;
  tourId?: string;
  minutes?: number;
  start?: number;
  guests?: number;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

async function checkout(request: Request, env: BookingEnv, ctx: BookingContext) {
  const { settings } = ctx;
  const now = ctx.now?.() ?? Date.now();
  if (!settings.enabled) throw new BookingError("Online booking is paused. Please call us to book.");
  const database = requireDb(env);
  if (!env.STRIPE_SECRET_KEY) throw new BookingError("Online payment isn't set up yet. Please call us to book.", 503);

  const body = (await request.json().catch(() => ({}))) as CheckoutBody;
  const date = clean(body.date, 10);
  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!name) throw new BookingError("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BookingError("Please enter a valid email address.");
  if (phone.replace(/\D/g, "").length < 10) throw new BookingError("Please enter a phone number we can reach you at.");

  const check = checkDate(settings, date, now);
  if (!check.ok) throw new BookingError(check.reason);
  const price = quote(settings, String(body.tourId), Number(body.minutes), Number(body.guests));
  // The start time must be one we actually offer that day.
  const slot = slotsFor(price.tour, price.minutes, date, ctx.geo).find((s) => s.start === Number(body.start));
  if (!slot) throw new BookingError("That start time isn't available. Please pick another.");
  if (tooSoon(settings, slot.start, now)) {
    throw new BookingError(`Online booking needs at least ${settings.minNoticeHours} hours' notice. Please call us for sooner trips.`);
  }

  await db.ensureSchema(database);
  const id = crypto.randomUUID();
  const releaseKey = crypto.randomUUID();
  const sessionExpires = Math.floor(now / 1000) + HOLD_MINUTES * 60 + 60; // Stripe needs at least 30 minutes
  const held = await db.createHold(
    database,
    {
      id,
      tour_type: price.tour.id,
      tour_label: price.tour.label,
      duration_min: price.minutes,
      start_utc: slot.start,
      end_utc: slot.end,
      guests: price.guests,
      amount_cents: price.total * 100,
      name,
      email,
      phone,
      notes,
      release_key: releaseKey,
      hold_expires_at: (sessionExpires + 120) * 1000, // a little longer than Stripe's session
      created_at: now,
    },
    settings.boats,
    now
  );
  if (!held) throw new BookingError("Sorry, that time was just booked. Please pick another.", 409);

  const origin = new URL(request.url).origin;
  const when = `${formatDate(slot.start)} at ${formatTime(slot.start)}`;
  const length = price.minutes % 60 === 0 ? `${price.minutes / 60} hour${price.minutes === 60 ? "" : "s"}` : `${price.minutes / 60} hours`;
  const description = `${when} · ${price.guests} guest${price.guests === 1 ? "" : "s"}`;
  try {
    const session = await createCheckoutSession(env, {
      mode: "payment",
      client_reference_id: id,
      customer_email: email,
      expires_at: sessionExpires,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: price.total * 100,
            product_data: { name: `${price.tour.label} (${length})`, description },
          },
        },
      ],
      metadata: { booking_id: id },
      payment_intent_data: {
        description: `${ctx.business.name}: ${price.tour.label}, ${description}`,
        receipt_email: email,
        metadata: { booking_id: id, guest_name: name, guest_phone: phone },
      },
      custom_text: fillPolicy(ctx) ? { submit: { message: fillPolicy(ctx).slice(0, 1000) } } : undefined,
      success_url: `${origin}/book/thanks/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book/?release=${id}&key=${releaseKey}`,
    });
    await db.setSession(database, id, session.id);
    return json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout failed", err);
    await db.markExpired(database, id);
    throw new BookingError("We couldn't start the payment. Please try again or call us.", 502);
  }
}

// Guest came back from Stripe without paying: free the hold right away.
async function release(request: Request, env: BookingEnv) {
  const database = requireDb(env);
  const { id, key } = (await request.json().catch(() => ({}))) as { id?: string; key?: string };
  if (!id || !key) return json({ ok: false });
  await db.ensureSchema(database);
  const b = await db.getBooking(database, String(id));
  if (!b || b.release_key !== key || b.status !== "hold") return json({ ok: false });
  if (b.stripe_session_id) {
    try {
      await expireCheckoutSession(env, b.stripe_session_id);
    } catch (err) {
      // If it can't be expired (e.g. it was just paid), keep the hold.
      console.error("Couldn't expire session", err);
      return json({ ok: false });
    }
  }
  await db.markExpired(database, b.id);
  return json({ ok: true });
}

// ----------------------------------------------------------------- status
const publicBooking = (b: db.BookingRow) => ({
  status: b.status,
  tour: b.tour_label,
  minutes: b.duration_min,
  date: formatDate(b.start_utc),
  time: formatTime(b.start_utc),
  endTime: formatTime(b.end_utc),
  guests: b.guests,
  amount: b.amount_cents / 100,
  name: b.name,
  email: b.email,
  phone: b.phone,
  notes: b.notes,
});

async function status(url: URL, env: BookingEnv, ctx: BookingContext) {
  const database = requireDb(env);
  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return fail("Booking not found.", 404);
  await db.ensureSchema(database);
  let b = await db.getBySession(database, sessionId);
  if (!b) return fail("Booking not found.", 404);
  // If the webhook hasn't arrived yet, ask Stripe directly.
  if (b.status === "hold") {
    try {
      const s = await getCheckoutSession(env, sessionId);
      if (s.payment_status === "paid") {
        await db.markPaid(database, b.id, s.payment_intent ?? null, ctx.now?.() ?? Date.now());
        b = (await db.getBooking(database, b.id))!;
      }
    } catch (err) {
      console.error("Couldn't check session", err);
    }
  }
  return json({ booking: publicBooking(b), policy: fillPolicy(ctx), phone: ctx.business.phone });
}

// ----------------------------------------------------------------- webhook
async function webhook(request: Request, env: BookingEnv, ctx: BookingContext) {
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return fail("Invalid signature.", 400);
  const event = JSON.parse(payload) as { type: string; data: { object: any } };
  const database = requireDb(env);
  await db.ensureSchema(database);
  const session = event.data?.object ?? {};
  const id = session.metadata?.booking_id || session.client_reference_id;
  if (!id) return json({ received: true });
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (session.payment_status === "paid") {
      await db.markPaid(database, id, session.payment_intent ?? null, ctx.now?.() ?? Date.now());
    }
  } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    await db.markExpired(database, id);
  }
  return json({ received: true });
}

// ----------------------------------------------------------------- admin
const tokenCache = new Map<string, number>();

async function requireAdmin(request: Request, env: BookingEnv) {
  const token = (request.headers.get("Authorization") ?? "").replace(/^(Bearer|token)\s+/i, "").trim();
  if (!token) throw new BookingError("Please sign in.", 401);
  const cached = tokenCache.get(token);
  if (cached && cached > Date.now()) return;
  const repo = env.ADMIN_REPO || "docpng/website-test";
  const res = await fetch(`${env.GITHUB_API_BASE || "https://api.github.com"}/repos/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "sfairboat-bookings", Accept: "application/vnd.github+json" },
  });
  const data = (await res.json().catch(() => ({}))) as { permissions?: { push?: boolean } };
  if (!res.ok || !data.permissions?.push) throw new BookingError("This GitHub account can't view bookings.", 403);
  tokenCache.set(token, Date.now() + 5 * 60_000);
}

async function adminList(request: Request, url: URL, env: BookingEnv, ctx: BookingContext) {
  await requireAdmin(request, env);
  const database = requireDb(env);
  await db.ensureSchema(database);
  const range = url.searchParams.get("range") ?? "upcoming";
  const now = ctx.now?.() ?? Date.now();
  const day = 86_400_000;
  const rows = await db.listBookings(database, {
    from: range === "upcoming" ? now - day / 2 : now - 366 * day,
    to: range === "upcoming" ? undefined : now,
    includeHolds: url.searchParams.get("holds") === "1",
  });
  const paid = rows.filter((r) => r.status === "paid");
  return json({
    boats: ctx.settings.boats,
    bookings: rows.map((b) => ({
      id: b.id,
      ...publicBooking(b),
      start: b.start_utc,
      end: b.end_utc,
      paymentIntent: b.stripe_payment_intent,
      createdAt: b.created_at,
      // More paid bookings overlapping than boats (e.g. a hold expired mid-payment)
      overbooked: b.status === "paid" && overlapping(paid.filter((p) => p.id !== b.id).map((p) => ({ start: p.start_utc, end: p.end_utc })), b.start_utc, b.end_utc) >= ctx.settings.boats,
    })),
  });
}

async function adminCancel(request: Request, env: BookingEnv, ctx: BookingContext) {
  await requireAdmin(request, env);
  const database = requireDb(env);
  await db.ensureSchema(database);
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) throw new BookingError("Missing booking.");
  await db.markCancelled(database, String(id), ctx.now?.() ?? Date.now());
  const b = await db.getBooking(database, String(id));
  return json({ ok: true, booking: b ? { id: b.id, ...publicBooking(b), paymentIntent: b.stripe_payment_intent } : null });
}

// ----------------------------------------------------------------- router
export async function handleBooking(request: Request, env: BookingEnv, ctx: BookingContext): Promise<Response | null> {
  const url = new URL(request.url);
  const route = `${request.method} ${url.pathname.replace(/\/+$/, "")}`;
  try {
    switch (route) {
      case "GET /api/booking/availability":
        return await availability(url, env, ctx);
      case "POST /api/booking/checkout":
        return await checkout(request, env, ctx);
      case "POST /api/booking/release":
        return await release(request, env);
      case "GET /api/booking/status":
        return await status(url, env, ctx);
      case "POST /api/stripe/webhook":
        return await webhook(request, env, ctx);
      case "GET /api/admin/bookings":
        return await adminList(request, url, env, ctx);
      case "POST /api/admin/bookings/cancel":
        return await adminCancel(request, env, ctx);
      default:
        return null;
    }
  } catch (err) {
    if (err instanceof BookingError) return fail(err.message, err.status);
    console.error("Booking error", err);
    return fail("Something went wrong. Please try again or call us.", 500);
  }
}
