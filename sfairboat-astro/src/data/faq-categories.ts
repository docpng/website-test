export const faqCategories = ["tours", "fishing", "python", "lobster", "logistics", "general"] as const;
export type FAQCategory = (typeof faqCategories)[number];

// Headings used when FAQs are grouped by category (FAQs page).
export const faqCategoryLabels: Record<FAQCategory, string> = {
  tours: "Airboat tours",
  fishing: "Fishing",
  python: "Python hunts",
  lobster: "Lobster bully netting",
  logistics: "Booking & logistics",
  general: "General",
};
