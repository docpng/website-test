import type { Section } from "./sections";
import { requireFields, loadFolder } from "./validate";

// Content lives in src/content/service-areas/*.json (edited in the CMS at /admin).

export type ServiceArea = {
  order?: number;
  slug: string;
  city: string;
  state: string;
  stateAbbr: string;
  seoTitle: string;
  metaDescription: string;
  intro: string;
  localAngle: string;
  driveTime: string;
  // The page, top to bottom: built-in parts plus any sections added in the
  // site editor. When empty, the default layout (data/layouts.ts) is used.
  layout?: Section[];
};

export const serviceAreas: ServiceArea[] = loadFolder<ServiceArea>(
  import.meta.glob("../content/service-areas/*.json", { eager: true }),
  (a, source) =>
    requireFields(a, ["slug", "city", "state", "stateAbbr", "seoTitle", "metaDescription", "intro", "localAngle", "driveTime"], source)
);

export const getServiceArea = (slug: string) =>
  serviceAreas.find((a) => a.slug === slug);
