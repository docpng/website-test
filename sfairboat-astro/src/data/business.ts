import content from "../content/business.json";
import { requireFields } from "./validate";

// Editable details (name, phone, hours, social links, ...) live in
// src/content/business.json and are edited in the CMS at /admin.
// The technical settings below stay in code.
requireFields(content, ["name", "phone", "address", "bookingUrl"], "src/content/business.json");

const phoneDigits = content.phone.replace(/\D/g, "");
const googleMapsUrl =
  "https://www.google.com/maps/place/South+Florida+Airboat+Adventures/data=!4m2!3m1!1s0x0:0x6e8ee5ce38bae2f9?sa=X&ved=1t:2428&ictx=111";

export const business = {
  ...content,
  phoneHref: `tel:+${phoneDigits.length === 10 ? "1" : ""}${phoneDigits}`,
  phoneDisplay: content.phone,
  // Approximate — replace with the exact coordinates for 5334 FL-90 before launch
  geo: {
    latitude: 25.76,
    longitude: -80.49,
  },
  // Contact form → Gmail. Get a free key at https://web3forms.com (enter the Gmail address).
  // The key is safe to be public; it only tells Web3Forms which inbox to send to.
  formAccessKey: "cde7c622-a0d1-429e-8c7f-adc3e36f3079",
  googleMapsUrl,
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJa0mIKKGV2YgR-eK6OM7ljm4",
  siteUrl: "https://www.sfairboatadventures.com",
  social: {
    ...content.social,
    google: googleMapsUrl,
  },
};

export const addressLine = `${business.address.street}, ${business.address.city}, ${business.address.region} ${business.address.postalCode}`;
