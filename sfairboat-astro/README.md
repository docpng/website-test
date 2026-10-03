# South Florida Airboat Adventures — Astro

A full rebuild of [sfairboatadventures.com](https://www.sfairboatadventures.com) on [Astro](https://astro.build), with the SEO fixes we discussed applied: proper title tags, JSON-LD schema markup on every page type, a correct footer, cleaner markup, no placeholder content, built-in sitemap, and faster static output. ss

## What's in here

```
sfairboat-astro/
├── astro.config.mjs       # Astro + Tailwind + sitemap
├── package.json
├── tsconfig.json
├── wrangler.jsonc         # Cloudflare config (static site + /api/reviews)
├── worker/index.ts        # live Google reviews + GitHub login for the site editor
├── public/
│   ├── admin/             # site editor (Sveltia CMS) at /admin
│   ├── robots.txt
│   ├── favicon.svg
│   ├── og-default.jpg     # replace with a real 1200x630 image
│   └── images/gallery/    # drop your photos here
└── src/
    ├── content/           # editable content (JSON), managed in the site editor
    │   ├── business.json  # name, phone, hours, booking URL, owner, social links
    │   ├── services/      # one file per service
    │   ├── service-areas/ # one file per city
    │   ├── faqs.json
    │   └── gallery.json
    ├── data/              # loads + checks the content, plus technical settings
    │   ├── business.ts    # form key, site URL, Google links, coordinates
    │   ├── services.ts
    │   ├── service-areas.ts
    │   ├── faqs.ts
    │   └── schema.ts      # JSON-LD generators
    ├── layouts/
    │   └── BaseLayout.astro  # head, meta, OG, schema wiring
    ├── components/        # Header, Footer, Hero, ServiceCard, FAQList, etc.
    ├── pages/
    │   ├── index.astro
    │   ├── [service].astro   # one page per service (airboat-tours, python-hunts, ...)
    │   ├── reviews.astro
    │   ├── faqs.astro
    │   ├── gallery.astro
    │   ├── areas-we-serve.astro
    │   ├── contact-us.astro
    │   └── service-area/[slug].astro  # 6 city pages, generated statically
    └── styles/
        └── global.css     # Tailwind + custom design tokens
```

All pages are generated as static HTML at build time — no server required.

## Setup

Requires Node.js 20.x or newer.

```bash
npm install
npm run dev          # local dev at http://localhost:4321
npm run build        # production build to ./dist
npm run preview      # preview the production build
```

## Deploying

Since the output is pure static HTML/CSS/JS, you can host anywhere. Easiest options:

- **Cloudflare (Workers & Pages, current dashboard):** connect the GitHub repo. Build command `npm run build`, deploy command `npx wrangler deploy`, root directory `/` (the folder containing `package.json`). The included `wrangler.jsonc` tells Cloudflare to serve `./dist` as static assets, so no auto-detection is needed. To deploy from your own machine instead: `npx wrangler login` once, then `npm run deploy`.
- **Netlify:** same — connect repo, build command `npm run build`, publish directory `dist`. Free.
- **Vercel:** connect repo, Astro is auto-detected. Free.

For a quick test deploy without a repo:

```bash
npm run build
# Then drag the ./dist folder onto app.netlify.com/drop
```

## Before launch — things to change

### 1. Business details (`src/data/business.ts`)
- **`geo.latitude` / `geo.longitude`** — replace the approximate coords with the exact lat/long for 5334 FL-90. (Right-click the address in Google Maps → copy coordinates.)
- Everything else should be accurate, but double-check.

### 2. Google reviews (Reviews page)
The Reviews page loads the rating and up to 5 reviews live from Google through `worker/index.ts`. To turn it on:
1. In Google Cloud Console, create a project, attach a billing account, and enable **Places API (New)**.
2. Create an API key and restrict it to **Places API (New)** only.
3. In Cloudflare, open the Worker → **Settings → Variables and Secrets** → add a **Secret** named `GOOGLE_PLACES_API_KEY` with the key.
4. Add the official Google Maps attribution logo at `public/images/google-maps-logo.svg` (from Google's attribution guidelines). Until then, the page shows the text "Google Maps" instead.

Until the key is set, the page shows a "Read our reviews on Google" link instead of cards.

Notes:
- Google returns at most 5 reviews and chooses which ones.
- Each Reviews page view makes one API call (Google's terms don't allow caching review content). Requests that include reviews bill under the Place Details Enterprise + Atmosphere SKU, which has a monthly free allowance; set a quota and a budget alert in Google Cloud.
- Reviews are intentionally **not** added to the schema markup. Google doesn't show star ratings for a business's reviews of itself on its own site, and its guidelines prohibit marking up reviews collected from other sites.
- Local testing: `npm run dev` doesn't run the worker, so the page shows the fallback. To test reviews locally, copy `.dev.vars.example` to `.dev.vars`, add your key, then run `npm run build && npx wrangler dev`.

### 3. OG image (`public/og-default.jpg`)
- There's a `.README.txt` where this should go. Drop in a real 1200×630 JPEG — ideally a strong airboat shot.

### 4. Gallery images
- Replace the placeholder photos in the site editor (**Gallery** at `/admin`).

### 5. Contact form endpoint (`src/pages/contact-us.astro`)
- The form currently points at `https://formspree.io/f/YOUR_FORM_ID`. Options:
  - Sign up for [Formspree](https://formspree.io) (free tier), paste the real form ID
  - Use [Basin](https://usebasin.com) or [Netlify Forms](https://docs.netlify.com/forms/setup/)
  - Build your own serverless function endpoint

### 6. Social links in header & footer
- Already pulling from `src/data/business.ts` → `social`. Confirm Facebook, Instagram, and Google URLs are correct.

### 7. Favicon
- `public/favicon.svg` is a simple generated airboat icon. Replace with the client's real brand mark if there's a proper SVG version.

### 8. Logo in header
- The header currently renders an inline SVG icon + text (South Florida / Airboat Adventures) rather than loading a logo file. If you have the original PNG/SVG logo, swap it in at the top of `src/components/Header.astro`.

## Fixes already applied vs. the current site

- ✅ **Title tag rewritten** to lead with "Miami Airboat Tours & Everglades Adventures" and include the brand name
- ✅ **Meta description** aligned with primary service (airboat tours), not just fishing
- ✅ **LocalBusiness + TouristAttraction schema** on homepage with full address, geo, hours, services catalog
- ✅ **Service schema** on each of the 4 service pages
- ✅ **FAQPage schema** on homepage FAQ section, FAQs page, and each service page
- ✅ **BreadcrumbList schema** on every inner page
- ✅ **Service-area schema** on each city page
- ✅ **Footer `Services` column populated** with all 4 services
- ✅ **Social links in footer** point at real business profiles (not generic facebook.com/)
- ✅ **No "Service 6/7/8" or "Insert content" placeholders** anywhere
- ✅ **Sitemap** auto-generated at `/sitemap-index.xml` + `/sitemap-0.xml` by the `@astrojs/sitemap` integration
- ✅ **robots.txt** points at the sitemap
- ✅ **Fast static output** — no Vistaprint/GoDaddy builder overhead

## Testing schema after deploy

Once live:
1. Run the homepage URL through [Google's Rich Results Test](https://search.google.com/test/rich-results)
2. Run each service page through the same
3. Run the FAQ page through [schema.org's validator](https://validator.schema.org/) for a more detailed syntax check
4. Submit the sitemap in Google Search Console: `Settings → Sitemaps → Add new sitemap → sitemap-index.xml`

## Editing content (site editor at /admin)

Gallery photos, FAQs, services, service areas and business info are edited at
**/admin** on the site, e.g. https://tekanelectronics.com/admin while on the
test domain ([Sveltia CMS](https://sveltiacms.app)).
Pressing **Save** commits the change to GitHub, and Cloudflare rebuilds and
publishes the site automatically, usually within 1–2 minutes. No code or manual
deploys needed. Reviews still come from Google automatically.

- Adding a **service** creates its page (at `/the-page-address`) and adds it to
  the menus and homepage. Adding a **service area** creates its city page.
- Uploaded photos are converted to WebP and resized to at most 2000px automatically.
- If something is entered incorrectly (e.g. a required field left empty), the
  Cloudflare build fails with a message naming the file, and the live site
  stays as it was. Fix it in the editor and save again.
- The editor saves to the **`main`** branch, which must be the branch Cloudflare
  deploys to production.

### One-time setup: GitHub login
Editors sign in with a GitHub account that has write access to `docpng/website-test`.
1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: `https://tekanelectronics.com` (the domain the site runs on)
   - Authorization callback URL: `https://tekanelectronics.com/api/callback`
2. Copy the **Client ID**, then click **Generate a new client secret** and copy it.
3. In Cloudflare, open the Worker → **Settings → Variables and Secrets** and add
   two **Secrets**: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
4. To let someone else edit, add them as a collaborator on the GitHub repository.

Until step 3 is done, you can still sign in with **"Sign in with token"** on the
editor's login screen, using a GitHub
[fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
limited to this repository with **Contents: Read and write** permission.

The editor follows whatever domain it's opened on. GitHub only accepts the one
domain in the OAuth App's callback URL, so when the site moves to
`www.sfairboatadventures.com`, change the Homepage and callback URLs in the
OAuth App to that domain (no code change needed). Open the editor on that exact
domain: `https://tekanelectronics.com/admin`, not `www.tekanelectronics.com/admin`,
unless the callback URL uses `www`.

## Design notes

- **Palette:** moss greens, warm sand, bone — Everglades-grounded, deliberately not the generic cream-and-terracotta AI default.
- **Typography:** Fraunces (display, variable serif) + Inter (body). Loaded from Google Fonts.
- **Layout:** 7xl content container, generous vertical rhythm, hairline borders over heavy card shadows.
- **No motion library.** Hover transitions only, respects `prefers-reduced-motion`.

## License

Code: MIT. Brand assets, logo, photos, and business copy remain property of South Florida Airboat Adventures.
