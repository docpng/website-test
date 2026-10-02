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
 * Secrets / variables:
 *   GOOGLE_PLACES_API_KEY  secret, set in the Cloudflare dashboard (never commit it)
 *   GOOGLE_PLACE_ID        plain variable, set in wrangler.jsonc
 */

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_PLACE_ID?: string;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/reviews") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return handleReviews(env);
    }

    if (pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    // Anything else falls through to the static site.
    return env.ASSETS.fetch(request);
  },
};
