export type Service = {
  slug: string;
  name: string;
  shortName: string;
  icon: "airboat" | "fish" | "gig" | "python";
  seoTitle: string;
  metaDescription: string;
  tagline: string;
  summary: string;
  longDescription: string[];
  highlights: string[];
  whoItsFor: string;
  whatsIncluded: string[];
  schemaCategory: string;
  schemaType: string;
};

export const services: Service[] = [
  {
    slug: "airboat-tours",
    name: "Private Airboat Tours",
    shortName: "Airboat Tours",
    icon: "airboat",
    seoTitle:
      "Private Airboat Tours in Miami, FL | South Florida Airboat Adventures",
    metaDescription:
      "Private, guided airboat tours through the Florida Everglades out of Miami. Veteran-owned, small groups, and a real Gladesman at the helm.",
    tagline: "Fast, private, Gladesman-led rides through the real Everglades.",
    summary:
      "Our airboat tours provide a fast-paced, up-close Everglades adventure. We guide you safely through winding waterways, pointing out wildlife and landmarks. With us, you'll experience Florida's natural beauty fully, making unforgettable memories on every thrilling journey.",
    longDescription: [
      "No two airboat rides with us look the same. Every tour is private to your group, so you set the pace — whether that's a high-speed cruise across open sawgrass or a slow drift to watch an alligator sun itself on the bank.",
      "You're not riding with a hired driver reading off a script. You're riding with a Gladesman — someone who grew up on these waterways and still runs them most days of the week. That means real knowledge about the ecosystem, local history, and the wildlife that calls the River of Grass home.",
      "Tours depart from our location on FL-90 in Miami, with easy access from anywhere in Miami-Dade and Broward counties. We run day and night rides year-round, by appointment.",
    ],
    highlights: [
      "Private, group-only tours — never shared with strangers",
      "Veteran-owned and operated",
      "Expert local guide with 10+ years on the water",
      "Alligators, wading birds, turtles, and native plant life",
      "Day and night tours available",
    ],
    whoItsFor:
      "Families, couples, first-time visitors to Florida, photographers, and anyone who wants an authentic Everglades experience — not a theme-park version of one.",
    whatsIncluded: [
      "Private airboat and captain for your group",
      "Hearing protection",
      "Narration and wildlife spotting from a lifelong Gladesman",
      "Flexible route tailored to what your group wants to see",
    ],
    schemaCategory: "Guided Tour",
    schemaType: "TouristTrip",
  },
  {
    slug: "everglades-fishing-trips",
    name: "Everglades Fishing Trips",
    shortName: "Fishing Trips",
    icon: "fish",
    seoTitle:
      "Everglades Fishing Trips from Miami | South Florida Airboat Adventures",
    metaDescription:
      "Guided Everglades fishing trips for beginners and seasoned anglers. All gear and tackle included. Private trips led by a lifelong Gladesman.",
    tagline: "Guided freshwater fishing in the heart of the Everglades.",
    summary:
      "Our Everglades fishing trips suit beginners and seasoned anglers alike. We provide our expert knowledge, tackle, and guidance to ensure a fun, exciting, and productive day on the water. With us, you'll catch some of South Florida's prized fish.",
    longDescription: [
      "The Everglades is one of the most productive freshwater fisheries in the country, and we know where the fish are holding on any given day. Our guided trips cover the backwaters most tour operators never see — the kind of water where a local guide makes the difference between a quiet day and a cooler full of fish.",
      "Beginner? We'll teach you from the ground up. Experienced angler? We'll put you on fish and get out of your way. Either way, you're coming home with stories.",
      "All trips are private to your group. We handle the gear, bait, licenses guidance, and the boat — you bring sunscreen, a hat, and a willingness to be out on the water.",
    ],
    highlights: [
      "Private trips tailored to your experience level",
      "Rods, reels, tackle, and bait all provided",
      "Target species include largemouth bass, bluegill, snakehead, and more",
      "Half-day and full-day options",
      "Great for first-time anglers and seasoned fishermen",
    ],
    whoItsFor:
      "Anglers of every level — first-timers, families introducing kids to fishing, and experienced fishermen who want local knowledge of Everglades waters.",
    whatsIncluded: [
      "All rods, reels, tackle, and bait",
      "Private boat and captain",
      "Expert guidance on technique and reading the water",
      "Advice on licenses and regulations",
    ],
    schemaCategory: "Guided Fishing Trip",
    schemaType: "Service",
  },
  {
    slug: "fish-gigging",
    name: "Nighttime Fish Gigging",
    shortName: "Fish Gigging",
    icon: "gig",
    seoTitle:
      "Nighttime Fish Gigging in the Everglades | South Florida Airboat Adventures",
    metaDescription:
      "Guided nighttime fish gigging trips in the South Florida wetlands. A traditional Florida fishing method, all gear and lighting provided.",
    tagline: "A traditional Florida fishing method, led by a local who still practices it.",
    summary:
      "Join us for nighttime fish gigging adventures in the wetlands. We provide all necessary gear, guidance, and support so you can safely experience this traditional Florida fishing method. With our team, you'll enjoy learning and participating in this unique activity.",
    longDescription: [
      "Fish gigging is one of the oldest fishing traditions in Florida — hunting fish by lamplight from the deck of a slow-moving boat. It's hands-on, it's unlike anything else, and it's a side of Florida most visitors never see.",
      "We go out after dark with proper lighting and gear, and we show you how to spot, approach, and gig fish the way it's been done here for generations. First-timers are welcome; we'll walk you through every step.",
      "This isn't a ride-along — you're participating. By the end of the night, you'll have hands-on experience with a practice that's been part of Florida's culture for longer than Florida has been a state.",
    ],
    highlights: [
      "After-dark trips with proper lighting and gear",
      "Hands-on — you're participating, not watching",
      "Full instruction from a lifelong practitioner",
      "A side of Florida most visitors never see",
      "Private to your group",
    ],
    whoItsFor:
      "Curious adventurers, outdoor enthusiasts, and anyone looking for an experience that's genuinely rooted in Florida culture.",
    whatsIncluded: [
      "All gigs and gear",
      "Powerful boat-mounted lighting",
      "Instruction and safety briefing",
      "Private boat and guide for your group",
    ],
    schemaCategory: "Nighttime Fishing Experience",
    schemaType: "Service",
  },
  {
    slug: "python-hunts",
    name: "Guided Python Hunts",
    shortName: "Python Hunts",
    icon: "python",
    seoTitle:
      "Guided Python Hunts in the Everglades | South Florida Airboat Adventures",
    metaDescription:
      "Guided Burmese python hunts in the Florida Everglades. Help remove invasive species alongside experienced local guides. Safety instruction included.",
    tagline: "Hands-on invasive-species removal in the Everglades, led by locals.",
    summary:
      "Our python hunts offer an exciting, educational wildlife experience in South Florida. With our trained guides, you'll safely track and capture invasive pythons, learning about their ecological impact while actively participating in this important wildlife management effort with us.",
    longDescription: [
      "Burmese pythons are one of the most destructive invasive species the Everglades has ever faced, and local hunters are on the front line of removing them. We take guests out alongside experienced guides for hands-on python hunts — a mix of education, conservation, and genuine adventure.",
      "You'll learn how pythons move, where they hide, and what their presence has done to native wildlife populations. You'll also learn how to safely spot, approach, and capture them under the guidance of hunters who do this work year-round.",
      "This is a serious, respectful activity: it's about protecting an ecosystem under threat, not about trophies. We train everyone fully before heading out, and safety is non-negotiable.",
    ],
    highlights: [
      "Hands-on invasive-species removal",
      "Full safety training and briefing",
      "Learn about the Everglades ecosystem and the python's impact",
      "Guided by experienced local hunters",
      "A conservation-focused experience, not a stunt",
    ],
    whoItsFor:
      "Adults with an interest in wildlife, conservation, or hands-on outdoor experiences. All experience levels welcome; we train you from the ground up.",
    whatsIncluded: [
      "Full safety briefing and training",
      "All necessary equipment",
      "Experienced guide",
      "Private trip for your group",
    ],
    schemaCategory: "Wildlife Management Experience",
    schemaType: "Service",
  },
];

export const getService = (slug: string) =>
  services.find((s) => s.slug === slug);
