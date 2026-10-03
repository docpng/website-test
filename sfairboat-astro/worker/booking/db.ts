// Booking storage in Cloudflare D1 (binding "DB").

export type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      first<T = Record<string, unknown>>(): Promise<T | null>;
    };
  };
  exec(sql: string): Promise<unknown>;
};

export type BookingRow = {
  id: string;
  status: "hold" | "paid" | "cancelled" | "expired";
  tour_type: string;
  tour_label: string;
  duration_min: number;
  start_utc: number;
  end_utc: number;
  guests: number;
  amount_cents: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  release_key: string;
  hold_expires_at: number;
  created_at: number;
  paid_at: number | null;
  cancelled_at: number | null;
};

let schemaReady: Promise<unknown> | null = null;

// Creates the table on first use, so no separate migration step is needed.
export function ensureSchema(db: D1Like) {
  schemaReady ??= db
    .exec(
      "CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, status TEXT NOT NULL, tour_type TEXT NOT NULL, tour_label TEXT NOT NULL, duration_min INTEGER NOT NULL, start_utc INTEGER NOT NULL, end_utc INTEGER NOT NULL, guests INTEGER NOT NULL, amount_cents INTEGER NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', stripe_session_id TEXT, stripe_payment_intent TEXT, release_key TEXT NOT NULL, hold_expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, paid_at INTEGER, cancelled_at INTEGER);" +
        "CREATE INDEX IF NOT EXISTS bookings_start ON bookings (start_utc);" +
        "CREATE INDEX IF NOT EXISTS bookings_session ON bookings (stripe_session_id);"
    )
    .catch((err) => {
      schemaReady = null;
      throw err;
    });
  return schemaReady;
}

const ACTIVE = "(status = 'paid' OR (status = 'hold' AND hold_expires_at > ?))";

// Paid bookings and unexpired holds overlapping a time range.
export async function activeBetween(db: D1Like, from: number, to: number, now: number) {
  const { results } = await db
    .prepare(`SELECT start_utc AS start, end_utc AS "end" FROM bookings WHERE start_utc < ? AND end_utc > ? AND ${ACTIVE}`)
    .bind(to, from, now)
    .all<{ start: number; end: number }>();
  return results;
}

// Creates a hold only if fewer than `boats` active bookings overlap the slot.
// It's a single statement, so two guests can't both grab the last boat.
export async function createHold(
  db: D1Like,
  b: Omit<BookingRow, "status" | "stripe_session_id" | "stripe_payment_intent" | "paid_at" | "cancelled_at">,
  boats: number,
  now: number
): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT INTO bookings (id, status, tour_type, tour_label, duration_min, start_utc, end_utc, guests, amount_cents, name, email, phone, notes, release_key, hold_expires_at, created_at)
       SELECT ?, 'hold', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM bookings WHERE start_utc < ? AND end_utc > ? AND ${ACTIVE}) < ?`
    )
    .bind(
      b.id, b.tour_type, b.tour_label, b.duration_min, b.start_utc, b.end_utc, b.guests, b.amount_cents,
      b.name, b.email, b.phone, b.notes, b.release_key, b.hold_expires_at, b.created_at,
      b.end_utc, b.start_utc, now, boats
    )
    .run();
  return res.meta.changes === 1;
}

export const setSession = (db: D1Like, id: string, sessionId: string) =>
  db.prepare("UPDATE bookings SET stripe_session_id = ? WHERE id = ?").bind(sessionId, id).run();

export const getBooking = (db: D1Like, id: string) =>
  db.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first<BookingRow>();

export const getBySession = (db: D1Like, sessionId: string) =>
  db.prepare("SELECT * FROM bookings WHERE stripe_session_id = ?").bind(sessionId).first<BookingRow>();

// Marks a booking paid. Works even if the hold has expired; returns true the
// first time only (so notifications aren't repeated).
export async function markPaid(db: D1Like, id: string, paymentIntent: string | null, now: number) {
  const res = await db
    .prepare("UPDATE bookings SET status = 'paid', stripe_payment_intent = COALESCE(?, stripe_payment_intent), paid_at = ? WHERE id = ? AND status != 'paid'")
    .bind(paymentIntent, now, id)
    .run();
  return res.meta.changes === 1;
}

export const markExpired = (db: D1Like, id: string) =>
  db.prepare("UPDATE bookings SET status = 'expired' WHERE id = ? AND status = 'hold'").bind(id).run();

export const markCancelled = (db: D1Like, id: string, now: number) =>
  db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND status IN ('paid', 'hold')").bind(now, id).run();

export async function listBookings(db: D1Like, opts: { from?: number; to?: number; includeHolds?: boolean }) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.from != null) {
    where.push("start_utc >= ?");
    args.push(opts.from);
  }
  if (opts.to != null) {
    where.push("start_utc < ?");
    args.push(opts.to);
  }
  if (!opts.includeHolds) where.push("status IN ('paid', 'cancelled')");
  const sql = `SELECT * FROM bookings ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY start_utc ASC LIMIT 500`;
  const { results } = await db.prepare(sql).bind(...args).all<BookingRow>();
  return results;
}
