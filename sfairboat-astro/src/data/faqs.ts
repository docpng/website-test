import data from "../content/faqs.json";
import { requireFields, requireOneOf } from "./validate";
import { faqCategories, type FAQCategory } from "./faq-categories";
import { getService } from "./services";

// Content lives in src/content/faqs.json (edited in the CMS at /admin).

export type FAQ = {
  question: string;
  answer: string;
  category: FAQCategory;
};

export const faqs: FAQ[] = (data.items as FAQ[]).map((f, i) => {
  const source = `src/content/faqs.json (FAQ #${i + 1})`;
  requireFields(f, ["question", "answer", "category"], source);
  requireOneOf(f.category, faqCategories, "category", source);
  return f;
});

// Which FAQs appear on each service page is set on the service itself
// (faqCategories / faqLimit). The page and its FAQ schema both use this,
// so what Google reads always matches what visitors see.
export const getServiceFaqs = (slug: string): FAQ[] => {
  const service = getService(slug);
  if (!service) return faqs.slice(0, 4);
  return faqs
    .filter((f) => service.faqCategories.includes(f.category))
    .slice(0, service.faqLimit ?? 4);
};
