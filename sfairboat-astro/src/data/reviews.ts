export type Review = {
  author: string;
  rating: number; // 1–5
  date: string; // ISO
  text: string;
  service: string;
};

/**
 * Placeholder reviews — replace with real ones from Google.
 * If you add real reviews here, keep them attributed to the actual author
 * and make sure the content on the Reviews page matches what the
 * aggregateRating in your schema claims.
 */
export const reviews: Review[] = [
  {
    author: "Maria C.",
    rating: 5,
    date: "2025-11-14",
    text: "Best thing we did in Miami. Eian knows the Everglades inside and out and made the whole trip feel like a private adventure, not a tour. Saw gators, so many birds, and even got a lesson on invasive pythons.",
    service: "Private Airboat Tours",
  },
  {
    author: "David R.",
    rating: 5,
    date: "2025-10-22",
    text: "Took my kids on a half-day fishing trip and we had an absolute blast. All the gear was ready, Eian put the kids on fish within 15 minutes, and the stories alone were worth it.",
    service: "Everglades Fishing Trips",
  },
  {
    author: "Jenna T.",
    rating: 5,
    date: "2025-09-08",
    text: "Did the night fish gigging trip. Totally unlike anything I've ever done. Being out on the water in the dark with just the lights and someone who clearly loves what he does — unforgettable.",
    service: "Nighttime Fish Gigging",
  },
  {
    author: "Marcus H.",
    rating: 5,
    date: "2025-08-19",
    text: "The python hunt was the highlight of our Florida trip. Learned a ton about why invasive species removal matters, and got hands-on experience I'll be telling people about for years.",
    service: "Guided Python Hunts",
  },
  {
    author: "Priya S.",
    rating: 5,
    date: "2025-07-30",
    text: "Private tour for a group of six. Eian was welcoming, knowledgeable, and clearly cared about making it a great trip. Would 100% book again.",
    service: "Private Airboat Tours",
  },
  {
    author: "Tom K.",
    rating: 5,
    date: "2025-06-11",
    text: "Veteran-owned, locally run, and absolutely top notch. If you're in Miami and want to see something other than the beach, book this.",
    service: "Private Airboat Tours",
  },
];

export const aggregateRating = {
  value: 5.0,
  count: reviews.length,
};
