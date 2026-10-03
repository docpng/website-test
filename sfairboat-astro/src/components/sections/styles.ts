// Shared settings for page sections (edited in the site editor at /admin).
// Every class name is written out in full so Tailwind includes it in the CSS.
import { business, addressLine } from "../../data/business";
import theme from "../../content/theme.json";

export type Spacing = "none" | "compact" | "normal" | "roomy";
export type Background = "light" | "sand" | "dark" | "brand";
export type Width = "narrow" | "medium" | "wide" | "full";
export type Align = "left" | "center";

export type SectionSettings = {
  type: string;
  spacing?: Spacing | "";
  background?: Background | "";
  width?: Width | "";
  align?: Align | "";
  anchor?: string;
};

const spacingClasses: Record<Spacing, string> = {
  none: "",
  compact: "py-12 lg:py-14",
  normal: "py-20 lg:py-24",
  roomy: "py-28 lg:py-36",
};

const backgroundClasses: Record<Background, string> = {
  light: "",
  sand: "bg-sand-50",
  dark: "bg-moss-900 text-bone",
  brand: "bg-moss-800 text-bone",
};

const widthClasses: Record<Width, string> = {
  narrow: "max-w-4xl",
  medium: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function spacingOf(s: SectionSettings): Spacing {
  return (s.spacing || theme.sectionSpacing || "normal") as Spacing;
}

export function sectionClass(s: SectionSettings, defaults: { background?: Background } = {}) {
  const bg = (s.background || defaults.background || "light") as Background;
  return [backgroundClasses[bg], spacingClasses[spacingOf(s)]].filter(Boolean).join(" ");
}

export function containerClass(s: SectionSettings, defaultWidth: Width, extra = "") {
  const width = (s.width || defaultWidth) as Width;
  return [widthClasses[width], "mx-auto px-5 lg:px-8", s.align === "center" ? "text-center" : "", extra]
    .filter(Boolean)
    .join(" ");
}

export function isDark(s: SectionSettings, defaults: { background?: Background } = {}) {
  const bg = s.background || defaults.background || "light";
  return bg === "dark" || bg === "brand";
}

// Text colors that stay readable on light and dark backgrounds.
export function tone(dark: boolean) {
  return dark
    ? {
        eyebrow: "text-sand-300",
        heading: "text-bone",
        body: "text-sand-100",
        muted: "text-sand-200",
        linkText: "text-sand-300",
        linkBorder: "border-sand-300",
      }
    : {
        eyebrow: "text-moss-600",
        heading: "text-moss-950",
        body: "text-moss-800",
        muted: "text-moss-600",
        linkText: "text-moss-900",
        linkBorder: "border-moss-900",
      };
}

// Placeholders editors can type in text: {businessName}, {phone}, {ownerName},
// {years}, {hours}, {address}.
export function fill(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replaceAll("{businessName}", business.name)
    .replaceAll("{phone}", business.phoneDisplay)
    .replaceAll("{ownerName}", business.owner.name)
    .replaceAll("{years}", String(business.foundedYears))
    .replaceAll("{hours}", business.hours)
    .replaceAll("{address}", addressLine);
}

// Special link values: {booking}, {phone}, {maps}, {review}.
export function resolveLink(link: string | undefined | null): string {
  switch ((link ?? "").trim()) {
    case "{booking}":
      return business.bookingUrl;
    case "{phone}":
      return business.phoneHref;
    case "{maps}":
      return business.googleMapsUrl;
    case "{review}":
      return business.googleReviewUrl;
    default:
      return (link ?? "").trim();
  }
}


// Markdown (bold, italics, links, lists) for longer text fields.
import { marked } from "marked";
export function markdown(text: string | undefined | null): string {
  return marked.parse(fill(text), { async: false, gfm: true, breaks: false }) as string;
}
