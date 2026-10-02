# South Florida Airboat Adventures — Astro

A full rebuild of [sfairboatadventures.com](https://www.sfairboatadventures.com) on [Astro](https://astro.build), with the SEO fixes we discussed applied: proper title tags, JSON-LD schema markup on every page type, a correct footer, cleaner markup, no placeholder content, built-in sitemap, and faster static output.

## What's in here

```
sfairboat-astro/
├── astro.config.mjs       # Astro + Tailwind + sitemap
├── package.json
├── tsconfig.json
├── public/
│   ├── robots.txt
│   ├── favicon.svg
│   ├── og-default.jpg     # replace with a real 1200x630 image
│   └── images/gallery/    # drop your photos here
└── src/
    ├── data/              # single source of truth for all content
    │   ├── business.ts    # NAP, phone, hours, booking URL, owner
    │   ├── services.ts    # 4 service definitions
    │   ├── service-areas.ts
    │   ├── faqs.ts
    │   ├── reviews.ts
    │   └── schema.ts      # JSON-LD generators
    ├── layouts/
    │   └── BaseLayout.astro  # head, meta, OG, schema wiring
    ├── components/        # Header, Footer, Hero, ServiceCard, FAQList, etc.
    ├── pages/
    │   ├── index.astro
    │   ├── airboat-tours.astro
    │   ├── everglades-fishing-trips.astro
    │   ├── fish-gigging.astro
    │   ├── python-hunts.astro
    │   ├── reviews.astro
    │   ├── faqs.astro
    │   ├── gallery.astro
    │   ├── areas-we-serve.astro
    │   ├── contact-us.astro
    │   └── service-area/[slug].astro  # 6 city pages, generated statically
    └── styles/
        └── global.css     # Tailwind + custom design tokens
```

**16 pages total.** All generated as static HTML at build time — no server required.

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

- **Cloudflare Pages:** connect the GitHub repo, set build command `npm run build`, output directory `dist`. Free.
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

### 2. Reviews (`src/data/reviews.ts`)
- The 6 reviews in there are **placeholders**. Replace with real Google reviews (keeping the real author names), or import them automatically later via a Google Places API script.
- The homepage `localBusinessSchema` claims an `aggregateRating` of 5.0 based on the count in this file. **Keep that honest** — Google can and does penalize fake review schema.

### 3. OG image (`public/og-default.jpg`)
- There's a `.README.txt` where this should go. Drop in a real 1200×630 JPEG — ideally a strong airboat shot.

### 4. Gallery images (`public/images/gallery/`)
- Add real photos as `placeholder-1.jpg` through `placeholder-8.jpg`, or edit `src/pages/gallery.astro` to use whatever filenames you prefer.

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
- ✅ **LocalBusiness + TouristAttraction schema** on homepage with full address, geo, hours, services catalog, aggregate rating
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

## Content editing after launch

All copy, services, FAQs, service areas, and reviews live in `src/data/*.ts`. Edit those files, run `npm run build`, and redeploy. No CMS yet — if the owner wants to self-edit without touching code, a small headless CMS like [Decap CMS](https://decapcms.org) or [TinaCMS](https://tina.io) can be bolted on later.

## Design notes

- **Palette:** moss greens, warm sand, bone — Everglades-grounded, deliberately not the generic cream-and-terracotta AI default.
- **Typography:** Fraunces (display, variable serif) + Inter (body). Loaded from Google Fonts.
- **Layout:** 7xl content container, generous vertical rhythm, hairline borders over heavy card shadows.
- **No motion library.** Hover transitions only, respects `prefers-reduced-motion`.

## License

Code: MIT. Brand assets, logo, photos, and business copy remain property of South Florida Airboat Adventures.
