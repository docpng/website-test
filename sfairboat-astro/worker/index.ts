/**
 * Cloudflare Worker for sfairboatadventures.com
 *
 * Static pages are served straight from ./dist by Cloudflare. This script
 * only runs for /api/* requests (see "run_worker_first" in wrangler.jsonc).
 *
 * GET /api/reviews
 *   Fetches the rating, review count, and up to 5 reviews for the business
 *   from the Google Places API (New) and returns a trimmed JSON response.
 *
 * GET /api/auth, GET /api/callback
 *   GitHub login for the site editor at /admin (Sveltia CMS). /api/auth sends
 *   the editor to GitHub; /api/callback swaps GitHub's code for an access
 *   token and hands it back to the editor window.
 *
 * /api/booking/*, /api/stripe/webhook, /api/admin/bookings*
 *   Online booking for airboat tours, paid with Stripe (see worker/booking/).
 *
 * Secrets / variables:
 *   GOOGLE_PLACES_API_KEY  secret, set in the Cloudflare dashboard (never commit it)
 *   GOOGLE_PLACE_ID        plain variable, set in wrangler.jsonc
 *   GITHUB_CLIENT_ID       secret, from the GitHub OAuth App (see README)
 *   GITHUB_CLIENT_SECRET   secret, from the GitHub OAuth App (never commit it)
 *   STRIPE_SECRET_KEY      secret, from the Stripe dashboard (Developers > API keys)
 *   STRIPE_WEBHOOK_SECRET  secret, from the Stripe webhook endpoint (whsec_...)
 *   DB                     D1 database binding for bookings (wrangler.jsonc)
 */

import bookingSettings from "../src/content/booking.json";
import businessContent from "../src/content/business.json";
import { handleBooking, type BookingEnv } from "./booking/api.ts";
import { checkSettings, type BookingSettings } from "./booking/settings.ts";

// Dock location for sunrise/sunset times (same as src/data/business.ts).
const DOCK = { lat: 25.76, lng: -80.49 };
const bookingContext = {
  settings: checkSettings(bookingSettings as BookingSettings),
  geo: DOCK,
  business: { name: businessContent.name, phone: businessContent.phone },
};

type Env = BookingEnv & {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_PLACE_ID?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

type GoogleReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
};

type GooglePlace = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
};

// Only request the fields we display. Including "reviews" bills the call
// under Google's "Place Details Enterprise + Atmosphere" SKU.
const FIELD_MASK = "rating,userRatingCount,googleMapsUri,reviews";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Google's Places API terms don't allow caching review content,
      // so every page view gets a fresh copy.
      "Cache-Control": "no-store",
    },
  });
}

async function handleReviews(env: Env): Promise<Response> {
  if (!env.GOOGLE_PLACES_API_KEY || !env.GOOGLE_PLACE_ID) {
    return json({ error: "Reviews are not configured." }, 503);
  }

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(
    env.GOOGLE_PLACE_ID
  )}?languageCode=en`;

  let place: GooglePlace;
  try {
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
    });
    if (!response.ok) {
      // Log the detail for debugging (visible in Cloudflare's Worker logs),
      // but don't expose Google's error message to visitors.
      console.error("Places API error", response.status, await response.text());
      return json({ error: "Could not load reviews." }, 502);
    }
    place = (await response.json()) as GooglePlace;
  } catch (err) {
    console.error("Places API request failed", err);
    return json({ error: "Could not load reviews." }, 502);
  }

  const reviews = (place.reviews ?? [])
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? "Google user",
      authorUrl: r.authorAttribution?.uri ?? null,
      authorPhoto: r.authorAttribution?.photoUri ?? null,
      rating: r.rating ?? null,
      text: r.text?.text ?? r.originalText?.text ?? "",
      relativeTime: r.relativePublishTimeDescription ?? "",
      publishTime: r.publishTime ?? null,
      reviewUrl: r.googleMapsUri ?? null,
    }))
    .filter((r) => r.text.trim().length > 0);

  return json({
    rating: place.rating ?? null,
    count: place.userRatingCount ?? 0,
    mapsUrl: place.googleMapsUri ?? null,
    reviews,
  });
}

// ---------------------------------------------------------------------------
// Site editor (Sveltia CMS) GitHub login

const STATE_COOKIE = "cms_oauth_state";

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

// The popup page that passes the result back to the editor window. It only
// talks to a window on this same site, using the handshake Sveltia/Decap CMS
// expect: "authorizing:github", then "authorization:github:<status>:<json>".
function authResultPage(
  origin: string,
  status: "success" | "error",
  content: Record<string, string>
): Response {
  // Escape "<" so the JSON can't close the <script> tag.
  const message = JSON.stringify(
    `authorization:github:${status}:${JSON.stringify(content)}`
  ).replace(/</g, "\\u003c");
  const target = JSON.stringify(origin).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title></head><body>
<p>${status === "success" ? "Signed in. You can close this window." : "Sign-in failed. Close this window and try again."}</p>
<script>
(() => {
  const origin = ${target};
  const message = ${message};
  window.addEventListener("message", (e) => {
    if (e.source === window.opener && e.origin === origin && e.data === "authorizing:github") {
      window.opener.postMessage(message, origin);
    }
  });
  if (window.opener) window.opener.postMessage("authorizing:github", origin);
})();
</script></body></html>`;
  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Clear the one-time state cookie.
      "Set-Cookie": `${STATE_COOKIE}=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

// Pass through the permissions the editor asks for (e.g. "repo,user"), but
// only from this list.
const ALLOWED_SCOPES = new Set(["repo", "public_repo", "user", "read:user", "user:email"]);
function authScope(requested: string | null): string {
  const scopes = (requested ?? "")
    .split(/[\s,]+/)
    .filter((scope) => ALLOWED_SCOPES.has(scope));
  return scopes.length > 0 ? scopes.join(",") : "repo";
}

function handleAuth(request: Request, env: Env): Response {
  const url = new URL(request.url);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return authResultPage(url.origin, "error", {
      error: "GitHub login isn't set up yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Cloudflare.",
    });
  }

  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
  authorize.searchParams.set("scope", authScope(url.searchParams.get("scope")));
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Cache-Control": "no-store",
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = getCookie(request, STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return authResultPage(url.origin, "error", { error: "Sign-in expired or was tampered with. Please try again." });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return authResultPage(url.origin, "error", { error: "GitHub login isn't set up yet." });
  }

  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "sfairboat-cms-auth",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/callback`,
      }),
    });
    const data = (await response.json()) as { access_token?: string; error_description?: string };
    if (!data.access_token) {
      console.error("GitHub token exchange failed", response.status, data.error_description);
      return authResultPage(url.origin, "error", { error: data.error_description ?? "GitHub didn't return a token." });
    }
    return authResultPage(url.origin, "success", { token: data.access_token, provider: "github" });
  } catch (err) {
    console.error("GitHub token request failed", err);
    return authResultPage(url.origin, "error", { error: "Couldn't reach GitHub. Please try again." });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/reviews") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return handleReviews(env);
    }

    if (pathname === "/api/auth" && request.method === "GET") {
      return handleAuth(request, env);
    }

    if (pathname === "/api/callback" && request.method === "GET") {
      return handleCallback(request, env);
    }

    const booking = await handleBooking(request, env, bookingContext);
    if (booking) return booking;

    if (pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    // Anything else falls through to the static site.
    return env.ASSETS.fetch(request);
  },
};
