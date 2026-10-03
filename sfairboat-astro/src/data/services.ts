import type { Section } from "./sections";
import { requireFields, requireOneOf, loadFolder } from "./validate";
import { faqCategories, type FAQCategory } from "./faq-categories";

// Content lives in src/content/services/*.json (edited in the CMS at /admin).
export type Service = {
  order?: number;
  slug: string;
  name: string;
  shortName: string;
  icon: (typeof serviceIcons)[number];
  seoTitle: string;
  metaDescription: string;
  tagline: string;
  summary: string;
  longDescription: string[];
  highlights: string[];
  whoItsFor: string;
  whatsIncluded: string[];
  schemaCategory: string;
  schemaType: string;
  // Optional trip details, shown on the service page when set
  price?: number;      // flat price per trip, in USD
  maxGuests?: number;
  season?: string;
  // Which FAQ categories show on this service page, and how many
  faqCategories: FAQCategory[];
  faqLimit?: number;
  // The page, top to bottom: built-in parts plus any sections added in the
  // site editor. When empty, the default layout (data/layouts.ts) is used.
  layout?: Section[];
  // Airboat tours can be booked and paid online at /book; others are requested.
  bookable?: boolean;
  // Optional photos/videos
  cardImage?: string; // photo at the top of this service's card
  heroImage?: string; // background photo behind the page title
  heroVideo?: string; // background video behind the page title (used instead of the photo)
  heroPoster?: string;
};

export const serviceIcons = ["airboat", "fish", "gig", "python", "lobster"] as const;

export const services: Service[] = loadFolder<Service>(
  import.meta.glob("../content/services/*.json", { eager: true }),
  (s, source) => {
    requireFields(s, ["slug", "name", "shortName", "icon", "seoTitle", "metaDescription", "tagline", "summary", "longDescription", "highlights", "whoItsFor", "whatsIncluded", "schemaCategory", "schemaType", "faqCategories"], source);
    requireOneOf(s.icon, serviceIcons, "icon", source);
    s.faqCategories.forEach((c) => requireOneOf(c, faqCategories, "faqCategories", source));
    return s;
  }
);

export const getService = (slug: string) =>
  services.find((s) => s.slug === slug);
