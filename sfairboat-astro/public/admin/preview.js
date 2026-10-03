// Live preview for the site editor's "Pages" collection.
// Shows each section roughly as it will look on the site, styled with the
// site's own stylesheet (copied to /admin/site.css at build time). Sections
// that list services, FAQs, cities or reviews show a placeholder here; the
// real content appears on the published page.
(() => {
  const h = window.createElement || window.h;
  if (!window.CMS || !h) return;

  const toJS = (v) => (v && typeof v.toJS === "function" ? v.toJS() : v);

  // Fill in {phone}, {businessName}, etc. like the live site does.
  let values = {};
  fetch("/admin/placeholders.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then((v) => (values = v || {}))
    .catch(() => {});
  const fill = (text) =>
    typeof text === "string" ? text.replace(/\{(businessName|phone|ownerName|years|hours|address)\}/g, (m, k) => values[k] ?? m) : text;
  const fillAll = (o) =>
    Array.isArray(o) ? o.map(fillAll) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fillAll(v)])) : fill(o);
  // Photos/videos placed inside text: same output as src/components/sections/inline-media.ts
  const escHtml = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const embedUrl = (url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\.|^m\./, "");
      const yt = host === "youtu.be" ? u.pathname.slice(1) : /youtube(-nocookie)?\.com$/.test(host) ? u.searchParams.get("v") || (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] : null;
      if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0`;
      const vimeo = /vimeo\.com$/.test(host) && (u.pathname.match(/(\d+)/) || [])[1];
      if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
    } catch {}
    return null;
  };
  function expandInlineMedia(md, asset) {
    return String(md || "").replace(/^\[\[(photo|video)((?:\s+[a-z]+="[^"]*")*)\s*\]\]$/gm, (m, kind, raw) => {
      const a = {};
      for (const x of raw.matchAll(/([a-z]+)="([^"]*)"/g)) a[x[1]] = x[2].replace(/&quot;/g, '"');
      const size = ["small", "medium", "full"].includes(a.size) ? a.size : "medium";
      const align = ["left", "center", "right"].includes(a.align) ? a.align : "center";
      let media = "";
      if (kind === "photo") media = a.src ? `<img src="${escHtml(asset(a.src))}" alt="${escHtml(a.alt)}">` : "";
      else if (a.url) {
        const e = embedUrl(a.url);
        media = e ? `<span class="md-embed"><iframe src="${escHtml(e)}" title="Video" allowfullscreen></iframe></span>` : "";
      } else if (a.src) media = `<video src="${escHtml(asset(a.src))}" ${a.playback === "controls" ? "controls" : "autoplay muted loop"} playsinline></video>`;
      if (!media) return "";
      return `\n\n<figure class="md-media md-${size} md-${align}">${media}${a.caption ? `<figcaption>${escHtml(a.caption)}</figcaption>` : ""}</figure>\n\n`;
    });
  }
  // Rich text: the Markdown the text toolbar produces (paragraphs, bold,
  // italics, links, lists) plus inline photos/videos.
  const inlineMd = (t) =>
    escHtml(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => (/^(https?:|\/|#|mailto:|tel:)/.test(url.replace(/&amp;/g, "&")) ? `<a href="${url}">${text}</a>` : text));
  function mdToHtml(md) {
    return md
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        if (block.startsWith("<figure")) return block;
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inlineMd(l.replace(/^\s*[-*+]\s+/, ""))}</li>`).join("")}</ul>`;
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return `<ol>${lines.map((l) => `<li>${inlineMd(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
        return `<p>${lines.map(inlineMd).join("<br>")}</p>`;
      })
      .join("");
  }
  const richText = (md, asset, className) =>
    h("div", { className, dangerouslySetInnerHTML: { __html: mdToHtml(expandInlineMedia(md, asset)) } });

  const widths = { narrow: "max-w-4xl", medium: "max-w-5xl", wide: "max-w-7xl", full: "max-w-none" };
  const spacing = { none: "", compact: "py-12 lg:py-14", normal: "py-20 lg:py-24", roomy: "py-28 lg:py-36" };
  const backgrounds = { light: "", sand: "bg-sand-50", dark: "bg-moss-900 text-bone", brand: "bg-moss-800 text-bone" };
  const isDark = (bg) => bg === "dark" || bg === "brand";
  const cx = (...c) => c.filter(Boolean).join(" ");

  function wrap(s, children, defaults = {}) {
    const bg = s.background || defaults.background || "light";
    return h(
      "section",
      { className: cx(backgrounds[bg], spacing[s.spacing || "normal"]) },
      h("div", { className: cx(widths[s.width || defaults.width || "wide"], "mx-auto px-5 lg:px-8", s.align === "center" && "text-center") }, children)
    );
  }

  function heading(s, dark, extra = "") {
    return [
      s.eyebrow && h("div", { key: "e", className: cx("text-xs tracking-[0.2em] uppercase font-medium mb-3", dark ? "text-sand-300" : "text-moss-600") }, s.eyebrow),
      s.heading && h("h2", { key: "h", className: cx(dark ? "text-bone" : "text-moss-950", extra) }, s.heading),
    ];
  }

  function placeholder(label, dark) {
    return h(
      "div",
      { className: cx("mt-8 border border-dashed p-8 text-center text-sm", dark ? "border-sand-300/40 text-sand-200" : "border-moss-900/30 text-moss-600") },
      label
    );
  }

  function render(s, widgets, asset) {
    const dark = isDark(s.background);
    switch (s.type) {
      case "hero": {
        const bgImage = s.media === "image" && s.image ? asset(s.image) : s.media === "video" && s.poster ? asset(s.poster) : null;
        return h(
          "section",
          { className: "relative overflow-hidden bg-moss-950 text-bone" },
          bgImage && h("img", { src: bgImage, alt: "", className: "absolute inset-0 w-full h-full object-cover" }),
          bgImage && h("div", { className: { light: "absolute inset-0 bg-moss-950/35", medium: "absolute inset-0 bg-moss-950/55", strong: "absolute inset-0 bg-moss-950/75" }[s.overlay || "medium"] }),
          h(
            "div",
            { className: cx("relative mx-auto px-5 lg:px-8 pt-20 pb-28", widths[s.width || "wide"]) },
            h(
              "div",
              { className: s.align === "center" ? "max-w-3xl mx-auto text-center" : "max-w-3xl" },
              s.eyebrow && h("div", { className: "text-xs tracking-[0.2em] uppercase text-sand-300 font-medium mb-6" }, s.eyebrow),
              h("h1", { className: "text-bone" }, s.heading || "Heading"),
              s.text && h("p", { className: "mt-6 text-lg text-sand-100 max-w-2xl" }, s.text),
              (s.buttons || []).length > 0 &&
                h(
                  "div",
                  { className: "mt-10 flex flex-wrap gap-4" },
                  s.buttons.map((b, i) =>
                    h("span", { key: i, className: b.style === "outline" ? "inline-flex items-center text-bone border border-sand-200/30 px-7 py-3.5 font-medium" : "inline-flex items-center bg-sand-400 text-moss-950 px-7 py-3.5 font-medium" }, b.label)
                  )
                ),
              (s.stats || []).length > 0 &&
                h(
                  "div",
                  { className: "mt-14 grid grid-cols-3 gap-6 max-w-2xl" },
                  s.stats.map((st, i) => h("div", { key: i }, h("div", { className: "font-display text-3xl text-sand-300" }, st.value), h("div", { className: "text-xs text-sand-200 mt-1" }, st.label)))
                ),
              s.media === "video" && placeholder("The background video plays here on the live site.", true)
            )
          )
        );
      }
      case "pageHeader":
        return h(
          "section",
          { className: s.background === "brand" ? "bg-moss-800 text-bone" : "bg-moss-900 text-bone" },
          h(
            "div",
            { className: cx(widths[s.width || "wide"], "mx-auto px-5 lg:px-8 py-16 lg:py-24", s.align === "center" && "text-center") },
            s.eyebrow && h("div", { className: "text-xs tracking-[0.2em] uppercase text-sand-300 font-medium mb-5" }, s.eyebrow),
            h("h1", { className: "text-bone max-w-4xl" }, s.title || "Page title"),
            s.intro && h("p", { className: "mt-6 text-lg text-sand-100 max-w-3xl" }, s.intro)
          )
        );
      case "text":
        return wrap(s, [...heading(s, dark), s.body && h("div", { key: "b" }, richText(s.body, asset, cx("mt-8 space-y-5 rich-text", dark ? "text-sand-100" : "text-moss-800")))], { width: "narrow" });
      case "image":
        return wrap(s, [
          ...heading(s, dark, "mb-10"),
          s.image && h("img", { key: "i", src: asset(s.image), alt: s.alt || "", className: "w-full h-auto" }),
          s.caption && h("p", { key: "c", className: "mt-3 text-sm text-moss-600" }, s.caption),
        ]);
      case "video":
        return wrap(s, [
          ...heading(s, dark, "mb-10"),
          s.source === "link"
            ? placeholder(`YouTube/Vimeo video: ${s.url || "(add a link)"}`, dark)
            : s.file
              ? h("video", { key: "v", src: asset(s.file), poster: s.poster ? asset(s.poster) : undefined, className: "w-full h-auto bg-moss-950", controls: true, muted: true })
              : placeholder("Upload a video", dark),
          s.caption && h("p", { key: "c", className: "mt-3 text-sm text-moss-600" }, s.caption),
        ]);
      case "imageText": {
        const media =
          s.media === "image" && s.image
            ? h("img", { src: asset(s.image), alt: s.alt || "", className: "w-full h-auto" })
            : s.media === "video" && s.video
              ? h("video", { src: asset(s.video), className: "w-full h-auto", muted: true, autoPlay: true, loop: true })
              : placeholder("Photo or video", dark);
        return wrap(
          s,
          h(
            "div",
            { className: "grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center" },
            h("div", { className: s.side === "right" ? "lg:order-last" : "" }, media),
            h(
              "div",
              null,
              ...heading(s, dark),
              s.body && richText(s.body, asset, cx("mt-6 space-y-5 rich-text", dark ? "text-sand-100" : "text-moss-800")),
              s.buttonLabel && h("span", { className: "mt-8 inline-flex items-center justify-center bg-moss-900 text-bone px-7 py-3.5 font-medium" }, s.buttonLabel)
            )
          )
        );
      }
      case "features":
        return wrap(
          s,
          [
            ...heading(s, dark),
            s.intro && h("p", { key: "p", className: cx("mt-6", dark ? "text-sand-100" : "text-moss-800") }, s.intro),
            h(
              "div",
              { key: "g", className: cx("mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6", { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[s.columns]) },
              (s.items || []).map((item, i) =>
                h(
                  "div",
                  { key: i },
                  s.numbered !== false && h("div", { className: "font-display text-sand-500 text-sm mb-2" }, String(i + 1).padStart(2, "0")),
                  h("h3", { className: cx(dark ? "text-bone" : "text-moss-950", "text-xl") }, item.title),
                  item.body && h("p", { className: cx("mt-3 text-sm", dark ? "text-sand-100" : "text-moss-800") }, item.body)
                )
              )
            ),
          ],
          { background: "sand" }
        );
      case "servicesGrid":
        return wrap(s, [...heading(s, dark), placeholder("Your services appear here as cards.", dark)]);
      case "faq":
        return wrap(s, [...heading(s, dark), placeholder("Questions from the FAQs list appear here.", dark)], { background: s.show === "grouped" ? "light" : "sand", width: s.show === "grouped" ? "narrow" : "medium" });
      case "areas":
        return wrap(s, [...heading(s, dark), placeholder("Your service-area cities appear here.", dark)]);
      case "gallery": {
        const photos = s.source === "custom" ? s.photos || [] : [];
        return wrap(s, [
          ...heading(s, dark, "mb-10"),
          photos.length
            ? h("div", { key: "g", className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" }, photos.map((p, i) => h("img", { key: i, src: asset(p.image), alt: p.alt || "", className: "aspect-square w-full object-cover" })))
            : placeholder("Photos from the Gallery appear here.", dark),
        ]);
      }
      case "reviews":
        return wrap(s, placeholder("Live Google reviews appear here.", false));
      case "contact":
        return wrap(s, [h("h2", { key: "h", className: "text-moss-950" }, s.formHeading || "Request a quote"), s.formIntro && h("p", { key: "p", className: "mt-3 text-moss-800" }, s.formIntro), placeholder("Phone, address and the quote form appear here.", false)]);
      case "cta":
        return h(
          "section",
          { className: "bg-moss-800 text-bone" },
          h(
            "div",
            { className: "max-w-7xl mx-auto px-5 lg:px-8 py-16" },
            h("h2", { className: "text-bone" }, s.heading || "Ready to get out on the water?"),
            h("p", { className: "mt-3 text-sand-100" }, s.subheading || "Call us or book online. We'll put something together for your group.")
          )
        );
      case "map":
        return wrap(s, [...heading(s, dark, "mb-10"), placeholder("A Google Map of your address appears here.", dark)]);
      case "spacer":
        return h("div", { className: cx(backgrounds[s.background || "light"], { small: "h-8", medium: "h-16", large: "h-28" }[s.size || "medium"]) }, s.divider && h("div", { className: "max-w-7xl mx-auto px-5 lg:px-8 pt-4" }, h("div", { className: "rule" })));
      default:
        return null;
    }
  }

  function PagePreview({ entry, widgetsFor, getAsset }) {
    const data = toJS(entry.get("data")) || {};
    const asset = (src) => {
      if (!src) return "";
      try {
        return String(getAsset(src) || src);
      } catch {
        return src;
      }
    };
    let items = [];
    try {
      items = widgetsFor("sections") || [];
    } catch {
      items = [];
    }
    const sections = (data.sections || []).map(fillAll).map((s, i) => {
      const item = items[i];
      const widgets = item && item.get ? item.get("widgets") : null;
      return h("div", { key: i }, render(s, widgets, asset));
    });
    return h("div", { className: "bg-bone", style: { fontFamily: "var(--font-body)" } }, sections);
  }

  window.CMS.registerPreviewStyle("/admin/site.css");
  window.CMS.registerPreviewTemplate("pages", PagePreview);
})();
