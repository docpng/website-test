// Which FAQs an "FAQ" page section shows. The section and the page's FAQ
// schema both use this, so what Google reads matches what visitors see.
import { faqs, getServiceFaqs, type FAQ } from "./faqs";
import { faqCategories, type FAQCategory } from "./faq-categories";

export type FaqSection = {
  type: "faq";
  show?: "first" | "categories" | "grouped";
  count?: number;
  categories?: FAQCategory[];
};

export function faqItemsFor(section: FaqSection): FAQ[] {
  const show = section.show ?? "first";
  if (show === "grouped") {
    const shown = section.categories?.length ? section.categories : [...faqCategories];
    return faqs.filter((f) => shown.includes(f.category));
  }
  const pool =
    show === "categories" && section.categories?.length
      ? faqs.filter((f) => section.categories!.includes(f.category))
      : faqs;
  return section.count ? pool.slice(0, section.count) : pool;
}

// Every FAQ shown on a page, in page order, for its FAQ schema. Includes FAQ
// sections and the built-in FAQ part of service pages.
export function shownFaqs(
  sections: { type: string; part?: string; [key: string]: any }[],
  serviceSlug?: string
): FAQ[] {
  const seen = new Set<FAQ>();
  for (const s of sections) {
    const items =
      s.type === "faq"
        ? faqItemsFor(s as FaqSection)
        : s.type === "servicePart" && s.part === "faq" && serviceSlug
          ? getServiceFaqs(serviceSlug)
          : [];
    items.forEach((f) => seen.add(f));
  }
  return [...seen];
}
