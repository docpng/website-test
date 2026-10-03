export const faqCategories = ["tours", "fishing", "python", "lobster", "logistics", "general"] as const;
export type FAQCategory = (typeof faqCategories)[number];
