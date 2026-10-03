// Section types available in the site editor, and the fields each one needs.
import { requireFields, requireOneOf } from "./validate";

export const sectionRequiredFields = {
  hero: ["heading"],
  pageHeader: ["title"],
  text: [],
  image: ["image", "alt"],
  video: [],
  imageText: [],
  features: ["items"],
  servicesGrid: [],
  faq: [],
  areas: [],
  gallery: [],
  reviews: [],
  contact: [],
  cta: [],
  map: [],
  spacer: [],
  servicePart: ["part"],
  areaPart: ["part"],
} as const;

export type SectionType = keyof typeof sectionRequiredFields;
export const sectionTypes = Object.keys(sectionRequiredFields) as SectionType[];

export type Section = { type: SectionType; [key: string]: any };

// The built-in parts of service and city pages, in their default order.
export const serviceParts = ["hero", "overview", "details", "faq", "others"] as const;
export const areaParts = ["hero", "pitch", "services", "logistics"] as const;

// What a page's sections can draw on: the service or city the page is about.
// Uses structural types to avoid importing services.ts / service-areas.ts here.
export type SectionContext = {
  service?: import("./services").Service;
  area?: import("./service-areas").ServiceArea;
};

export function validateSection(section: Section, source: string, context?: SectionContext): Section {
  if (!section || typeof section !== "object") {
    throw new Error(`Content error in ${source}: section is empty.`);
  }
  requireOneOf(section.type, sectionTypes, "type", source);
  requireFields(section, [...sectionRequiredFields[section.type]], source);
  if (section.type === "servicePart") {
    requireOneOf(section.part, serviceParts, "part", source);
    if (context && !context.service) {
      throw new Error(`Content error in ${source}: "Service page part" sections only work on service pages.`);
    }
  }
  if (section.type === "areaPart") {
    requireOneOf(section.part, areaParts, "part", source);
    if (context && !context.area) {
      throw new Error(`Content error in ${source}: "City page part" sections only work on service-area (city) pages.`);
    }
  }
  if (section.type === "video") {
    const ok = section.source === "link" ? Boolean(section.url) : Boolean(section.file);
    if (!ok) throw new Error(`Content error in ${source}: the video section needs an uploaded video or a YouTube/Vimeo link.`);
  }
  return section;
}
