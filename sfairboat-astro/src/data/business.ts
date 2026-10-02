export const business = {
  name: "South Florida Airboat Adventures",
  shortName: "SFAA",
  tagline: "Private Everglades airboat tours, fishing trips, and python hunts out of Miami.",
  phone: "786-816-9850",
  phoneHref: "tel:+17868169850",
  phoneDisplay: "786-816-9850",
  email: "", // not public on the current site; add if you want it exposed
  address: {
    street: "5334 FL-90",
    city: "Miami",
    region: "FL",
    postalCode: "33185",
    country: "US",
  },
  // Approximate — replace with the exact coordinates for 5334 FL-90 before launch
  geo: {
    latitude: 25.76,
    longitude: -80.49,
  },
  hours: "24/7 by appointment",
  bookingUrl: "https://southfloridaairboatadventures.as.me/schedule/fa86adc3",
  googleMapsUrl:
    "https://www.google.com/maps/place/South+Florida+Airboat+Adventures/data=!4m2!3m1!1s0x0:0x6e8ee5ce38bae2f9?sa=X&ved=1t:2428&ictx=111",
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJa0mIKKGV2YgR-eK6OM7ljm4",
  siteUrl: "https://www.sfairboatadventures.com",
  owner: {
    name: "Eian Mislow",
    title: "Owner & Lead Guide",
  },
  foundedYears: 10,
  isVeteranOwned: true,
  social: {
    facebook:
      "https://facebook.com/people/South-Florida-Airboat-Adventures/61569997021652/",
    instagram: "https://instagram.com/sfairboatadventures",
    google:
      "https://www.google.com/maps/place/South+Florida+Airboat+Adventures/data=!4m2!3m1!1s0x0:0x6e8ee5ce38bae2f9?sa=X&ved=1t:2428&ictx=111",
  },
};

export const addressLine = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;
