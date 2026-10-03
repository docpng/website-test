// Which FAQs an "FAQ" page section shows. The section and the page's FAQ
// schema both use this, so what Google reads matches what visitors see.
import { faqs, type FAQ } from "./faqs";
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
