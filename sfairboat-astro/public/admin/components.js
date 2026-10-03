// "Photo" and "Video" buttons for text fields in the site editor. Each one
// inserts a one-line shortcode that the site turns into a <figure>
// (see src/components/sections/inline-media.ts).
(() => {
  if (!window.CMS) return;

  const SIZES = [
    { label: "Small", value: "small" },
    { label: "Medium", value: "medium" },
    { label: "Full width", value: "full" },
  ];
  const ALIGNS = [
    { label: "Centered", value: "center" },
    { label: "Left (text wraps around it)", value: "left" },
    { label: "Right (text wraps around it)", value: "right" },
  ];

  const parseAttrs = (raw) => {
    const out = {};
    for (const m of (raw || "").matchAll(/([a-z]+)="([^"]*)"/g)) out[m[1]] = m[2].replace(/&quot;/g, '"');
    return out;
  };
  const shortcode = (kind, attrs) =>
    `[[${kind}${Object.entries(attrs)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
      .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;").replace(/\n/g, " ")}"`)
      .join("")}]]`;
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const widths = { small: "18rem", medium: "32rem", full: "100%" };
  const box = (size, align, inner, caption) =>
    `<figure style="max-width:${widths[size] || widths.medium};margin:1rem ${align === "left" ? "auto 1rem 0" : align === "right" ? "0 1rem auto" : "auto"}">${inner}${
      caption ? `<figcaption style="font-size:.85em;opacity:.75;margin-top:.4rem">${esc(caption)}</figcaption>` : ""
    }</figure>`;

  window.CMS.registerEditorComponent({
    id: "photo",
    label: "Photo",
    icon: "image",
    fields: [
      { name: "src", label: "Photo", widget: "image" },
      { name: "alt", label: "Description", widget: "string", hint: "Describe the photo in a few words." },
      { name: "caption", label: "Caption", widget: "string", required: false },
      { name: "size", label: "Size", widget: "select", options: SIZES, default: "medium" },
      { name: "align", label: "Position", widget: "select", options: ALIGNS, default: "center" },
    ],
    pattern: /^\[\[photo((?:\s+[a-z]+="[^"]*")*)\s*\]\]$/,
    fromBlock: (match) => {
      const a = parseAttrs(match[1]);
      return { src: a.src || "", alt: a.alt || "", caption: a.caption || "", size: a.size || "medium", align: a.align || "center" };
    },
    toBlock: (d) => shortcode("photo", { src: d.src, alt: d.alt, caption: d.caption, size: d.size || "medium", align: d.align || "center" }),
    toPreview: (d) =>
      d.src ? box(d.size, d.align, `<img src="${esc(d.src)}" alt="${esc(d.alt)}" style="width:100%;height:auto;display:block">`, d.caption) : "",
  });

  window.CMS.registerEditorComponent({
    id: "video",
    label: "Video",
    icon: "movie",
    fields: [
      {
        name: "source",
        label: "Video source",
        widget: "select",
        default: "upload",
        options: [
          { label: "Uploaded video file", value: "upload" },
          { label: "YouTube or Vimeo link", value: "link" },
        ],
      },
      {
        name: "src",
        label: "Video file (MP4)",
        widget: "file",
        required: false,
        accept: "video/mp4",
        media_folder: "/sfairboat-astro/public/videos",
        public_folder: "/videos",
        hint: "Keep it under about 10 MB. 25 MB is the maximum.",
      },
      { name: "poster", label: "Still image before it plays", widget: "image", required: false },
      { name: "url", label: "YouTube or Vimeo link", widget: "string", required: false },
      {
        name: "playback",
        label: "How an uploaded video plays",
        widget: "select",
        default: "loop",
        options: [
          { label: "Silent loop that starts by itself", value: "loop" },
          { label: "Play button with sound", value: "controls" },
        ],
      },
      { name: "caption", label: "Caption", widget: "string", required: false },
      { name: "size", label: "Size", widget: "select", options: SIZES, default: "full" },
      { name: "align", label: "Position", widget: "select", options: ALIGNS, default: "center" },
    ],
    pattern: /^\[\[video((?:\s+[a-z]+="[^"]*")*)\s*\]\]$/,
    fromBlock: (match) => {
      const a = parseAttrs(match[1]);
      return {
        source: a.url ? "link" : "upload",
        src: a.src || "",
        poster: a.poster || "",
        url: a.url || "",
        playback: a.playback || "loop",
        caption: a.caption || "",
        size: a.size || "full",
        align: a.align || "center",
      };
    },
    toBlock: (d) =>
      shortcode(
        "video",
        d.source === "link"
          ? { url: d.url, caption: d.caption, size: d.size || "full", align: d.align || "center" }
          : { src: d.src, poster: d.poster, playback: d.playback || "loop", caption: d.caption, size: d.size || "full", align: d.align || "center" }
      ),
    toPreview: (d) =>
      d.source === "link"
        ? box(d.size, d.align, `<div style="aspect-ratio:16/9;background:#0e1a14;color:#e6d8b5;display:flex;align-items:center;justify-content:center;font-size:.85em">▶ ${esc(d.url || "YouTube/Vimeo video")}</div>`, d.caption)
        : d.src
          ? box(d.size, d.align, `<video src="${esc(d.src)}" ${d.poster ? `poster="${esc(d.poster)}"` : ""} muted controls style="width:100%;display:block"></video>`, d.caption)
          : "",
  });
})();
