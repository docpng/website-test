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
};

export const serviceAreas: ServiceArea[] = loadFolder<ServiceArea>(
  import.meta.glob("../content/service-areas/*.json", { eager: true }),
  (a, source) =>
    requireFields(a, ["slug", "city", "state", "stateAbbr", "seoTitle", "metaDescription", "intro", "localAngle", "driveTime"], source)
);

export const getServiceArea = (slug: string) =>
  serviceAreas.find((a) => a.slug === slug);
