export type FAQ = {
  question: string;
  answer: string;
  category: "tours" | "fishing" | "python" | "logistics" | "general";
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
      "Yes. We offer nighttime airboat tours and fish gigging trips, both of which show you a side of the Everglades most visitors never see.",
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
];
