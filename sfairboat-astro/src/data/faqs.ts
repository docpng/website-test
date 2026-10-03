export type FAQ = {
  question: string;
  answer: string;
  category: "tours" | "fishing" | "python" | "lobster" | "logistics" | "general";
};

export const faqs: FAQ[] = [
  {
    question: "Do I need prior experience for your airboat tours?",
    answer:
      "No experience is required. Our guides ensure a safe and enjoyable adventure for beginners and experienced riders alike.",
    category: "tours",
  },
  {
    question: "What should I bring for a fishing trip?",
    answer:
      "We provide all necessary fishing gear, but you should bring sunscreen, a hat, and comfortable clothing. Closed-toe shoes are recommended.",
    category: "fishing",
  },
  {
    question: "Are python hunts safe for beginners?",
    answer:
      "Yes. Our trained guides provide step-by-step instructions and a full safety briefing before every hunt, so first-timers can participate safely.",
    category: "python",
  },
  {
    question: "Are your tours private, or are they shared with other groups?",
    answer:
      "Every tour we run is private to your group. You'll never be stuck sharing a boat with strangers.",
    category: "general",
  },
  {
    question: "Where are you located?",
    answer:
      "We operate out of 5334 FL-90 in Miami, Florida 33185. We're easy to reach from anywhere in Miami-Dade and Broward counties.",
    category: "logistics",
  },
  {
    question: "What are your hours?",
    answer:
      "We run tours 24/7 by appointment. Call us at 786-816-9850 or use our online booking to schedule.",
    category: "logistics",
  },
  {
    question: "What's the best time of year to visit the Everglades?",
    answer:
      "The Everglades is beautiful year-round, but the dry season (roughly November through April) tends to be the most comfortable and offers the best wildlife viewing, as animals concentrate around the remaining water.",
    category: "general",
  },
  {
    question: "Do you run tours at night?",
    answer:
      "Yes. We offer nighttime airboat tours, fish gigging trips, and lobster bully netting charters, all of which show you a side of South Florida most visitors never see.",
    category: "tours",
  },
  {
    question: "How many people can come on a tour?",
    answer:
      "Our boats and trips are sized for small-to-medium private groups. Contact us with your party size and we'll let you know what works.",
    category: "general",
  },
  {
    question: "Do I need a fishing license?",
    answer:
      "Yes, Florida requires a freshwater fishing license for most visitors. We'll point you to the right resources before your trip, or you can purchase one directly from the Florida Fish and Wildlife Conservation Commission.",
    category: "fishing",
  },
  {
    question: "What should I wear?",
    answer:
      "Comfortable, weather-appropriate clothing. Bring layers for cooler mornings, sunscreen, a hat, sunglasses, and closed-toe shoes. For night trips, bring a light jacket.",
    category: "logistics",
  },
  {
    question: "Do you accept walk-ins?",
    answer:
      "We strongly recommend booking in advance to guarantee your spot, especially during peak season. Call us to check same-day availability.",
    category: "logistics",
  },
  {
    question: "When can I go lobster bully netting?",
    answer:
      "Only during Florida's spiny lobster season: the two-day sport season on the last Wednesday and Thursday in July, and the regular season from Aug. 6 through March 31. Lobster harvest is closed the rest of the year.",
    category: "lobster",
  },
  {
    question: "How many lobsters can I keep?",
    answer:
      "During the regular season, the limit is 6 lobsters per person per day. Every lobster must have a body shell (carapace) longer than 3 inches, measured in the water, and egg-bearing females must be released. Limits can differ during the two-day sport season depending on where we fish. Your captain will go over the rules and help you measure every catch.",
    category: "lobster",
  },
  {
    question: "Do I need a fishing license or lobster permit?",
    answer:
      "No. Guests on our lobster charter are covered by the boat's charter license, so you don't need to buy your own license or lobster permit.",
    category: "lobster",
  },
  {
    question: "How many people can come, and what does it cost?",
    answer:
      "Up to 4 guests per trip. The price is $800 per trip and covers the whole boat for your group.",
    category: "lobster",
  },
  {
    question: "Do I have to get in the water?",
    answer:
      "No. Bully netting is done entirely from the boat. You'll stand near the front and net lobsters off the bottom while the captain moves slowly across the flats.",
    category: "lobster",
  },
  {
    question: "What should I bring for lobster bully netting?",
    answer:
      "A light jacket or rain layer, since it gets cool on the water at night, plus a towel, shoes with good grip, and any snacks or drinks you'd like. Please leave glass bottles at home.",
    category: "lobster",
  },
];

// Which FAQs appear on each service page. The page and its FAQ schema both use
// this, so what Google reads always matches what visitors see.
const serviceFaqConfig: Record<string, { categories: FAQ["category"][]; limit: number }> = {
  "airboat-tours": { categories: ["tours", "general", "logistics"], limit: 4 },
  "everglades-fishing-trips": { categories: ["fishing", "general", "logistics"], limit: 4 },
  "fish-gigging": { categories: ["fishing", "tours", "logistics"], limit: 4 },
  "python-hunts": { categories: ["python", "general", "logistics"], limit: 4 },
  "lobster-bully-netting": { categories: ["lobster"], limit: 6 },
};

export const getServiceFaqs = (slug: string): FAQ[] => {
  const config = serviceFaqConfig[slug];
  if (!config) return faqs.slice(0, 4);
  return faqs.filter((f) => config.categories.includes(f.category)).slice(0, config.limit);
};
