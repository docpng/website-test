export type ServiceArea = {
  slug: string;
  city: string;
  state: string;
  stateAbbr: string;
  seoTitle: string;
  metaDescription: string;
  intro: string;
  localAngle: string;
  driveTime: string;
};

export const serviceAreas: ServiceArea[] = [
  {
    slug: "fishing-tours-fort-lauderdale-fl",
    city: "Fort Lauderdale",
    state: "Florida",
    stateAbbr: "FL",
    seoTitle:
      "Airboat Tours & Fishing Trips Serving Fort Lauderdale, FL | SFAA",
    metaDescription:
      "Private Everglades airboat tours, fishing trips, and python hunts for Fort Lauderdale, FL. Short drive to our Miami location.",
    intro:
      "Fort Lauderdale guests make up a steady share of our bookings. We're an easy drive south, and once you're on the water you're in a completely different Florida from the coast.",
    localAngle:
      "Fort Lauderdale is right at the edge of the metro, which means the Everglades is closer than most people realize. If you've only seen the beach side of South Florida, a day out here will reset what you thought the state looked like.",
    driveTime: "About 45 minutes south via I-75 or the Turnpike.",
  },
  {
    slug: "fishing-tours-miami-beach-fl",
    city: "Miami Beach",
    state: "Florida",
    stateAbbr: "FL",
    seoTitle: "Airboat Tours & Fishing Trips Serving Miami Beach, FL | SFAA",
    metaDescription:
      "Private Everglades airboat tours, fishing trips, and python hunts for Miami Beach visitors. Easy day trip from South Beach.",
    intro:
      "Miami Beach guests get the full South Florida contrast: ocean in the morning, Everglades in the afternoon. It's one of the best half-day escapes you can do without a hotel change.",
    localAngle:
      "If you're staying on South Beach or along Collins, you're less than an hour from a part of Florida that feels like a different century. We'll show you what the state looked like before anyone built a hotel on it.",
    driveTime: "About 45 minutes west via the Dolphin Expressway.",
  },
  {
    slug: "fishing-tours-hollywood-fl",
    city: "Hollywood",
    state: "Florida",
    stateAbbr: "FL",
    seoTitle: "Airboat Tours & Fishing Trips Serving Hollywood, FL | SFAA",
    metaDescription:
      "Private Everglades airboat tours, fishing trips, and python hunts for Hollywood, FL. Quick trip from Broward to the Glades.",
    intro:
      "Hollywood sits right between Miami and Fort Lauderdale, which makes us a short drive either way. Plenty of our Broward guests come down for a half-day on the water and are home for dinner.",
    localAngle:
      "You don't need to make a whole weekend of it. A morning or afternoon on the water with us is a complete trip — and it beats sitting on 95.",
    driveTime: "About 35–45 minutes southwest.",
  },
  {
    slug: "fishing-tours-hialeah-fl",
    city: "Hialeah",
    state: "Florida",
    stateAbbr: "FL",
    seoTitle: "Airboat Tours & Fishing Trips Serving Hialeah, FL | SFAA",
    metaDescription:
      "Private Everglades airboat tours, fishing trips, and python hunts for Hialeah, FL. Local, veteran-owned, and 20 minutes away.",
    intro:
      "Hialeah is practically next door. If you've lived here for years and still haven't done an Everglades trip, we're the easiest excuse to finally do it.",
    localAngle:
      "Locals know we take care of locals. Call us, tell us what you want to see, and we'll put something together that fits your schedule.",
    driveTime: "About 20 minutes west.",
  },
  {
    slug: "fishing-tours-south-miami-fl",
    city: "South Miami",
    state: "Florida",
    stateAbbr: "FL",
    seoTitle: "Airboat Tours & Fishing Trips Serving South Miami, FL | SFAA",
    metaDescription:
      "Private Everglades airboat tours, fishing trips, and python hunts for South Miami, FL. Short drive from one of our closest neighborhoods.",
    intro:
      "South Miami is one of our closest service areas. A quick trip west on the Tamiami Trail and you're at our dock.",
    localAngle:
      "If you've got out-of-town visitors and need a plan, this is it. A couple of hours on the water, something they'll genuinely remember, and you're back home before dinner.",
    driveTime: "About 20 minutes west on US-41.",
  },
  {
    slug: "fishing-tours-pinecrest-fl",
    city: "Pinecrest",
    state: "Florida",
    stateAbbr: "FL",
    seoTitle: "Airboat Tours & Fishing Trips Serving Pinecrest, FL | SFAA",
    metaDescription:
      "Private Everglades airboat tours, fishing trips, and python hunts for Pinecrest, FL. Veteran-owned, local, and nearby.",
    intro:
      "Pinecrest guests are some of our regulars. A short drive west and you've traded the suburbs for a stretch of water that doesn't look like anywhere else in the state.",
    localAngle:
      "We've guided families, groups of friends, and plenty of birthday parties from Pinecrest. Private trips mean we can shape the day around what your group actually wants.",
    driveTime: "About 25 minutes west.",
  },
];

export const getServiceArea = (slug: string) =>
  serviceAreas.find((a) => a.slug === slug);
