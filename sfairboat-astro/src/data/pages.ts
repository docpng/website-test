// Pages built from sections in the site editor (src/content/pages/*.json).
import { requireFields, loadFolder } from "./validate";
import { validateSection, type Section } from "./sections";
import { services } from "./services";

export type Page = {
  order?: number;
  title: string;
  slug: string; // "" = homepage
  seoTitle: string;
  metaDescription: string;
  ogImage?: string;
  sections: Section[];
};

// Paths already used by other parts of the site.
const reserved = new Set(["service-area", "admin", "api", "images", "videos", "_astro", "404"]);

export const pages: Page[] = loadFolder<Page>(
  import.meta.glob("../content/pages/*.json", { eager: true }),
  (p, source) => {
    requireFields(p, ["title", "seoTitle", "metaDescription"], source);
    p.slug = (p.slug ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (p.slug && !/^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/.test(p.slug)) {
      throw new Error(`Content error in ${source}: page address "${p.slug}" may only use lowercase letters, numbers and dashes.`);
    }
    if (reserved.has(p.slug.split("/")[0])) {
      throw new Error(`Content error in ${source}: the page address "${p.slug}" is reserved by the site. Pick another.`);
    }
    if (services.some((s) => s.slug === p.slug)) {
      throw new Error(`Content error in ${source}: the page address "${p.slug}" is already used by a service page. Pick another.`);
    }
    (p.sections ?? []).forEach((s, i) => validateSection(s, `${source} (section #${i + 1})`));
    p.sections = p.sections ?? [];
    return p;
  }
);

const seen = new Map<string, string>();
for (const p of pages) {
  if (seen.has(p.slug)) {
    throw new Error(`Content error: pages "${seen.get(p.slug)}" and "${p.title}" both use the address "/${p.slug}".`);
  }
  seen.set(p.slug, p.title);
}
if (!seen.has("")) {
  throw new Error('Content error: there is no homepage. One page must have an empty page address.');
}
