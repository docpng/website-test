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
} as const;

export type SectionType = keyof typeof sectionRequiredFields;
export const sectionTypes = Object.keys(sectionRequiredFields) as SectionType[];

export type Section = { type: SectionType; [key: string]: any };

export function validateSection(section: Section, source: string): Section {
  if (!section || typeof section !== "object") {
    throw new Error(`Content error in ${source}: section is empty.`);
  }
  requireOneOf(section.type, sectionTypes, "type", source);
  requireFields(section, [...sectionRequiredFields[section.type]], source);
  if (section.type === "video") {
    const ok = section.source === "link" ? Boolean(section.url) : Boolean(section.file);
    if (!ok) throw new Error(`Content error in ${source}: the video section needs an uploaded video or a YouTube/Vimeo link.`);
  }
  return section;
}
