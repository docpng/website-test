import { business, addressLine } from "./business";
import { services, type Service } from "./services";
import { serviceAreas } from "./service-areas";
import { aggregateRating } from "./reviews";
import { faqs, type FAQ } from "./faqs";

const BUSINESS_ID = `${business.siteUrl}/#business`;

const areaServedList = () => [
  ...serviceAreas.map((a) => ({
    "@type": "City",
    name: a.city,
    containedInPlace: { "@type": "State", name: a.state },
  })),
  { "@type": "AdministrativeArea", name: "Everglades, Florida" },
];

export const localBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "TouristAttraction"],
  "@id": BUSINESS_ID,
  name: business.name,
  image: `${business.siteUrl}/og-default.jpg`,
  url: business.siteUrl,
  telephone: `+1-${business.phone}`,
  priceRange: "$$",
  description: business.tagline,
  address: {
    "@type": "PostalAddress",
    streetAddress: business.address.street,
    addressLocality: business.address.city,
    addressRegion: business.address.region,
    postalCode: business.address.postalCode,
    addressCountry: business.address.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: business.geo.latitude,
    longitude: business.geo.longitude,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  ],
  areaServed: areaServedList(),
  sameAs: [business.social.facebook, business.social.instagram],
  founder: {
    "@type": "Person",
    name: business.owner.name,
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: aggregateRating.value,
    reviewCount: aggregateRating.count,
    bestRating: 5,
    worstRating: 1,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Services",
    itemListElement: services.map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s.name,
        url: `${business.siteUrl}/${s.slug}`,
      },
    })),
  },
});

export const serviceSchema = (service: Service) => ({
  "@context": "https://schema.org",
  "@type":
    service.schemaType === "TouristTrip"
      ? ["Service", "TouristTrip"]
      : "Service",
  "@id": `${business.siteUrl}/${service.slug}#service`,
  name: service.name,
  description: service.summary,
  url: `${business.siteUrl}/${service.slug}`,
  image: `${business.siteUrl}/og-default.jpg`,
  serviceType: service.shortName,
  category: service.schemaCategory,
  provider: { "@id": BUSINESS_ID },
  areaServed: areaServedList(),
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    priceCurrency: "USD",
    url: business.bookingUrl,
    businessFunction: "https://schema.org/Sell",
  },
  potentialAction: {
    "@type": "ReserveAction",
    target: business.bookingUrl,
    name: `Book ${service.shortName}`,
  },
});

export const faqPageSchema = (list: FAQ[] = faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: list.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
});

export const breadcrumbSchema = (crumbs: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: c.url,
  })),
});

export const serviceAreaSchema = (slug: string) => {
  const area = serviceAreas.find((a) => a.slug === slug);
  if (!area) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${business.siteUrl}/service-area/${slug}#service`,
    name: `Airboat Tours & Fishing Trips Serving ${area.city}, ${area.stateAbbr}`,
    description: area.metaDescription,
    url: `${business.siteUrl}/service-area/${slug}`,
    provider: { "@id": BUSINESS_ID },
    areaServed: {
      "@type": "City",
      name: area.city,
      containedInPlace: { "@type": "State", name: area.state },
    },
    offers: {
      "@type": "Offer",
      url: business.bookingUrl,
      priceCurrency: "USD",
    },
  };
};

export { addressLine };
