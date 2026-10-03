// Site Design settings (fonts, colors, spacing, buttons) from the site editor.
// Anything left at its default produces exactly the original design.
import theme from "../content/theme.json";

const serif = 'Georgia, "Times New Roman", serif';
const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// Google Fonts offered in the editor, with the weights the site uses.
export const fonts: Record<string, { query: string; fallback: string }> = {
  Fraunces: { query: "Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700", fallback: serif },
  "Playfair Display": { query: "Playfair+Display:wght@400;500;600;700", fallback: serif },
  Lora: { query: "Lora:wght@400;500;600;700", fallback: serif },
  Merriweather: { query: "Merriweather:wght@400;700", fallback: serif },
  "Libre Baskerville": { query: "Libre+Baskerville:wght@400;700", fallback: serif },
  "DM Serif Display": { query: "DM+Serif+Display", fallback: serif },
  Oswald: { query: "Oswald:wght@400;500;600;700", fallback: sans },
  Montserrat: { query: "Montserrat:wght@400;500;600;700", fallback: sans },
  Poppins: { query: "Poppins:wght@400;500;600;700", fallback: sans },
  Raleway: { query: "Raleway:wght@400;500;600;700", fallback: sans },
  Inter: { query: "Inter:wght@400;500;600;700", fallback: sans },
  "Open Sans": { query: "Open+Sans:wght@400;500;600;700", fallback: sans },
  "Source Sans 3": { query: "Source+Sans+3:wght@400;500;600;700", fallback: sans },
  Lato: { query: "Lato:wght@400;700", fallback: sans },
  Nunito: { query: "Nunito:wght@400;500;600;700", fallback: sans },
  Roboto: { query: "Roboto:wght@400;500;700", fallback: sans },
  "Work Sans": { query: "Work+Sans:wght@400;500;600;700", fallback: sans },
};

const defaults = {
  headingFont: "Fraunces",
  bodyFont: "Inter",
  darkColor: "#142319",
  accentColor: "#c2a35e",
  backgroundColor: "#f6f2e8",
  buttonCorners: "square",
};

function pickFont(name: string | undefined, fallbackName: string, field: string) {
  const chosen = name || fallbackName;
  if (!fonts[chosen]) {
    throw new Error(`Content error in src/content/theme.json: "${field}" is "${chosen}", which isn't in the font list.`);
  }
  return chosen;
}

function color(value: string | undefined, fallback: string, field: string) {
  const v = (value || fallback).trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(v)) {
    throw new Error(`Content error in src/content/theme.json: "${field}" should be a color like #142319.`);
  }
  return v;
}

const headingFont = pickFont(theme.headingFont, defaults.headingFont, "headingFont");
const bodyFont = pickFont(theme.bodyFont, defaults.bodyFont, "bodyFont");
const dark = color(theme.darkColor, defaults.darkColor, "darkColor");
const accent = color(theme.accentColor, defaults.accentColor, "accentColor");
const background = color(theme.backgroundColor, defaults.backgroundColor, "backgroundColor");
const corners = theme.buttonCorners || defaults.buttonCorners;

export const fontLinkHref = `https://fonts.googleapis.com/css2?${[...new Set([headingFont, bodyFont])]
  .map((f) => `family=${fonts[f].query}`)
  .join("&")}&display=swap`;

const mix = (c: string, pct: number, other: "white" | "black") =>
  `color-mix(in oklab, ${c} ${pct}%, ${other})`;

// CSS overrides for changed settings only. ":root:root" outranks the
// default theme values in the main stylesheet.
const vars: string[] = [];
if (headingFont !== defaults.headingFont) vars.push(`--font-display: "${headingFont}", ${fonts[headingFont].fallback};`);
if (bodyFont !== defaults.bodyFont) vars.push(`--font-body: "${bodyFont}", ${fonts[bodyFont].fallback};`);
if (dark !== defaults.darkColor) {
  vars.push(
    `--color-moss-950: ${mix(dark, 78, "black")};`,
    `--color-moss-900: ${dark};`,
    `--color-moss-800: ${mix(dark, 90, "white")};`,
    `--color-moss-700: ${mix(dark, 80, "white")};`,
    `--color-moss-600: ${mix(dark, 68, "white")};`,
    `--color-moss-500: ${mix(dark, 56, "white")};`,
    `--color-moss-400: ${mix(dark, 42, "white")};`,
    `--color-moss-300: ${mix(dark, 28, "white")};`,
    `--color-ink: ${mix(dark, 70, "black")};`
  );
}
if (accent !== defaults.accentColor) {
  vars.push(
    `--color-sand-50: ${mix(accent, 7, "white")};`,
    `--color-sand-100: ${mix(accent, 16, "white")};`,
    `--color-sand-200: ${mix(accent, 34, "white")};`,
    `--color-sand-300: ${mix(accent, 66, "white")};`,
    `--color-sand-400: ${accent};`,
    `--color-sand-500: ${mix(accent, 84, "black")};`,
    `--color-sand-600: ${mix(accent, 68, "black")};`
  );
}
if (background !== defaults.backgroundColor) vars.push(`--color-bone: ${background};`);

let css = vars.length ? `:root:root{${vars.join("")}}` : "";
if (corners !== defaults.buttonCorners) {
  const radius = corners === "pill" ? "9999px" : "0.5rem";
  css += `:is(a,button).inline-flex[class*="py-"]{border-radius:${radius}}`;
}
export const themeCss = css;
