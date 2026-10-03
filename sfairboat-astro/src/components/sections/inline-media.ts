// Photos and videos placed inside text in the site editor. The editor stores
// them as one-line shortcodes, e.g.
//   [[photo src="/images/uploads/boat.webp" alt="Our boat" size="medium" align="right" caption="…"]]
//   [[video src="/videos/tour.mp4" playback="loop" size="full" align="center"]]
//   [[video url="https://youtu.be/…" size="medium" align="center"]]
// These are turned into <figure> HTML before the Markdown is rendered.
// public/admin/preview.js and components.js mirror this for the editor.
import { embedUrl } from "./media";

const SHORTCODE = /^\[\[(photo|video)((?:\s+[a-z]+="[^"]*")*)\s*\]\]$/gm;

const sizes = ["small", "medium", "full"] as const;
const aligns = ["left", "center", "right"] as const;

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Values are stored with &quot; for quotes; undo that, then escape for HTML.
const attr = (attrs: Record<string, string>, key: string) => escapeHtml((attrs[key] ?? "").replace(/&quot;/g, '"'));

// Only site files ("/images/…") or https addresses may be used.
const safeSrc = (src: string) => (/^\/[^/]/.test(src) || /^https:\/\//.test(src) ? src : "");

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-z]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function figure(kind: string, attrs: Record<string, string>, source: string): string {
  const size = sizes.includes(attrs.size as any) ? attrs.size : "medium";
  const align = aligns.includes(attrs.align as any) ? attrs.align : "center";
  const caption = attrs.caption ? `<figcaption>${attr(attrs, "caption")}</figcaption>` : "";
  let media = "";
  if (kind === "photo") {
    const src = safeSrc(attrs.src ?? "");
    if (!src) throw new Error(`Content error in ${source}: a photo inside the text has no image.`);
    media = `<img src="${escapeHtml(src)}" alt="${attr(attrs, "alt")}" loading="lazy" decoding="async">`;
  } else if (attrs.url) {
    const embed = embedUrl(attrs.url.replace(/&quot;/g, '"'));
    if (!embed) throw new Error(`Content error in ${source}: "${attrs.url}" inside the text isn't a YouTube or Vimeo link.`);
    media = `<span class="md-embed"><iframe src="${escapeHtml(embed)}" title="${attr(attrs, "caption") || "Video"}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></span>`;
  } else {
    const src = safeSrc(attrs.src ?? "");
    if (!src) throw new Error(`Content error in ${source}: a video inside the text has no video file or link.`);
    const poster = safeSrc(attrs.poster ?? "");
    const posterAttr = poster ? ` poster="${escapeHtml(poster)}"` : "";
    media =
      attrs.playback === "controls"
        ? `<video src="${escapeHtml(src)}" controls playsinline preload="metadata"${posterAttr}></video>`
        : `<video src="${escapeHtml(src)}" autoplay muted loop playsinline preload="metadata"${posterAttr} aria-hidden="true"></video>`;
  }
  return `<figure class="md-media md-${size} md-${align}">${media}${caption}</figure>`;
}

export function expandInlineMedia(markdown: string, source = "text"): string {
  return markdown.replace(SHORTCODE, (_m, kind: string, raw: string) => `\n\n${figure(kind, parseAttrs(raw), source)}\n\n`);
}
