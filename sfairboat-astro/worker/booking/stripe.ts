// Minimal Stripe client (Checkout Sessions + webhook signatures) using fetch,
// so no SDK is needed in the Worker.

export type StripeEnv = { STRIPE_SECRET_KEY?: string; STRIPE_API_BASE?: string };

// Flattens { a: { b: 1 } } into Stripe's form encoding: a[b]=1
function encode(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) value.forEach((v, i) => encode({ [i]: v }, name, out));
    else if (typeof value === "object") encode(value as Record<string, unknown>, name, out);
    else out.append(name, String(value));
  }
  return out;
}

async function stripe<T>(env: StripeEnv, method: "GET" | "POST", path: string, params?: Record<string, unknown>): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe isn't set up (missing STRIPE_SECRET_KEY).");
  const base = env.STRIPE_API_BASE || "https://api.stripe.com";
  const res = await fetch(`${base}/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" && params ? encode(params).toString() : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status} ${data?.error?.message ?? ""}`.trim());
  return data as T;
}

export type CheckoutSession = { id: string; url: string; payment_status?: string; payment_intent?: string | null; metadata?: Record<string, string> };

export const createCheckoutSession = (env: StripeEnv, params: Record<string, unknown>) =>
  stripe<CheckoutSession>(env, "POST", "checkout/sessions", params);

export const getCheckoutSession = (env: StripeEnv, id: string) =>
  stripe<CheckoutSession>(env, "GET", `checkout/sessions/${encodeURIComponent(id)}`);

export const expireCheckoutSession = (env: StripeEnv, id: string) =>
  stripe<CheckoutSession>(env, "POST", `checkout/sessions/${encodeURIComponent(id)}/expire`);

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPayload(secret: string, timestamp: number, payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

// Checks the Stripe-Signature header ("t=...,v1=...") on a webhook.
export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300
): Promise<boolean> {
  if (!header || !secret) return false;
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = Number(v);
    if (k === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
  const expected = await signPayload(secret, timestamp, payload);
  return signatures.some((s) => timingSafeEqual(s, expected));
}
