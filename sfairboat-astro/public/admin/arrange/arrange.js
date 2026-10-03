// Arrange mode: drag photos and videos onto the real pages, move them and
// reorder sections, then publish to GitHub (the site rebuilds automatically).
//
// How it maps the page to content: SectionList (src/components/sections)
// writes invisible <!--arrange-...--> comments around each section with the
// content file, field and section index. Changes edit that JSON, which is the
// same content the site editor (/admin) uses.
(() => {
  "use strict";

  // ------------------------------------------------------------------ setup
  const $ = (id) => document.getElementById(id);
  const frame = $("frame");
  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // Local testing can point at a mock GitHub API.
  const API = (isLocal && localStorage.getItem("arrangeApiBase")) || "https://api.github.com";
  const TOKEN_KEY = "arrange-token";
  const MAX_VIDEO = 25 * 1024 * 1024; // Cloudflare's per-file limit
  const WARN_VIDEO = 10 * 1024 * 1024;
  const SITE_DIR = "sfairboat-astro"; // the site's folder inside the repository
  const IMAGE_FOLDER = `${SITE_DIR}/public/images/uploads`;
  const VIDEO_FOLDER = `${SITE_DIR}/public/videos`;

  const S = {
    token: sessionStorage.getItem(TOKEN_KEY) || "",
    repo: "",
    branch: "main",
    path: "/", // page being arranged
    info: null, // { file, field, defaultLayout }
    data: null, // parsed content file
    sha: null, // blob sha of the content file when loaded
    list: [], // the section list being edited (data[field])
    wraps: [], // one wrapper element per section, same order as list
    files: new Map(), // repo path -> Blob waiting to be uploaded
    dirty: false,
    selected: null, // { kind: "section", el } | { kind: "inline", el }
  };

  function status(text) {
    $("status").textContent = text || "";
  }
  function setDirty(on = true) {
    S.dirty = on;
    $("publish").disabled = !on;
    $("discard").disabled = !on;
    status(on ? "Unpublished changes" : "");
  }
  window.addEventListener("beforeunload", (e) => {
    if (S.dirty) e.preventDefault();
  });

  // ------------------------------------------------------------- GitHub API
  async function gh(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${S.token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      signOut("Your sign-in expired. Please sign in again.");
      throw new Error("Please sign in again.");
    }
    if (!res.ok) throw new Error(data.message || `GitHub error ${res.status}`);
    return data;
  }

  const utf8ToB64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const b64ToUtf8 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  async function blobToB64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  async function readContent(file) {
    const d = await gh(`/repos/${S.repo}/contents/${encodePath(file)}?ref=${encodeURIComponent(S.branch)}`);
    return { text: b64ToUtf8(d.content), sha: d.sha };
  }
  const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

  // One commit with the content file plus any new photos/videos.
  async function publish() {
    if (!S.dirty) return;
    $("publish").disabled = true;
    status("Publishing…");
    try {
      const current = await readContent(S.info.file);
      if (current.sha !== S.sha) {
        throw new Error("This page was changed elsewhere (for example in the site editor) since you opened it. Reload the page to get the latest version, then redo your changes.");
      }
      const ref = await gh(`/repos/${S.repo}/git/ref/heads/${encodeURIComponent(S.branch)}`);
      const head = await gh(`/repos/${S.repo}/git/commits/${ref.object.sha}`);
      const tree = [];
      for (const [path, blob] of S.files) {
        const b = await gh(`/repos/${S.repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: await blobToB64(blob), encoding: "base64" }) });
        tree.push({ path, mode: "100644", type: "blob", sha: b.sha });
      }
      S.data[S.info.field] = S.list;
      const text = JSON.stringify(S.data, null, 2) + "\n";
      const jsonBlob = await gh(`/repos/${S.repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: text, encoding: "utf-8" }) });
      tree.push({ path: S.info.file, mode: "100644", type: "blob", sha: jsonBlob.sha });
      const newTree = await gh(`/repos/${S.repo}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
      const name = S.info.file.split("/").pop().replace(/\.json$/, "");
      const commit = await gh(`/repos/${S.repo}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message: `Arrange “${name}” (via site editor)`, tree: newTree.sha, parents: [ref.object.sha] }),
      });
      await gh(`/repos/${S.repo}/git/refs/heads/${encodeURIComponent(S.branch)}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
      S.sha = jsonBlob.sha;
      S.files.clear();
      setDirty(false);
      status("Published. The live site updates in about 1–2 minutes.");
    } catch (err) {
      $("publish").disabled = false;
      status("");
      alert(`Couldn't publish: ${err.message}`);
    }
  }

  // -------------------------------------------------------------- sign in
  function showSignedIn(on) {
    $("signin").hidden = on;
    $("workspace").hidden = !on;
    $("signout").hidden = !on;
  }
  function signOut(message) {
    sessionStorage.removeItem(TOKEN_KEY);
    S.token = "";
    showSignedIn(false);
    $("signin-error").textContent = message || "";
  }
  async function signIn(token) {
    S.token = token;
    try {
      const repo = await gh(`/repos/${S.repo}`);
      if (!repo.permissions?.push) throw new Error("This GitHub account can't edit the site.");
    } catch (err) {
      S.token = "";
      $("signin-error").textContent = err.message;
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    $("signin-error").textContent = "";
    showSignedIn(true);
    loadPage(S.path);
  }
  $("github").addEventListener("click", () => {
    const popup = window.open("/api/auth?provider=github&scope=repo", "github-signin", "width=600,height=700");
    if (!popup) return ($("signin-error").textContent = "Please allow pop-ups for this site and try again.");
    const onMessage = ({ origin, data, source }) => {
      if (source !== popup || origin !== location.origin || typeof data !== "string") return;
      if (data === "authorizing:github") return popup.postMessage(data, origin);
      const m = data.match(/^authorization:github:(success|error):(.+)$/);
      if (!m) return;
      window.removeEventListener("message", onMessage);
      popup.close();
      let result = {};
      try {
        result = JSON.parse(m[2]);
      } catch {}
      if (m[1] === "success" && result.token) signIn(result.token);
      else $("signin-error").textContent = result.error || "Sign-in failed.";
    };
    window.addEventListener("message", onMessage);
  });
  $("use-token").addEventListener("click", () => {
    const t = $("token").value.trim();
    if (t) signIn(t);
  });
  $("signout").addEventListener("click", () => {
    if (S.dirty && !confirm("Sign out and lose your unpublished changes?")) return;
    setDirty(false);
    signOut();
  });

  // ------------------------------------------------------------ page list
  async function loadPageList() {
    const sel = $("page");
    let paths = [];
    try {
      const index = await (await fetch("/sitemap-index.xml")).text();
      const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
      for (const m of maps) {
        const xml = await (await fetch(m)).text();
        paths.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => new URL(x[1]).pathname));
      }
    } catch {}
    paths = [...new Set(paths)].filter((p) => !/^\/(book|admin)\b/.test(p));
    if (!paths.includes("/")) paths.unshift("/");
    const words = (t) => t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ Fl$/, ", FL");
    const label = (p) => {
      if (p === "/") return "Home";
      const name = p.replace(/^\/|\/$/g, "");
      return name.startsWith("service-area/") ? `City: ${words(name.slice(13))}` : words(name);
    };
    sel.replaceChildren(
      ...paths
        .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : label(a).localeCompare(label(b))))
        .map((p) => Object.assign(document.createElement("option"), { value: p, textContent: label(p) }))
    );
    sel.value = paths.includes(S.path) ? S.path : "/";
  }
  $("page").addEventListener("change", (e) => {
    if (S.dirty && !confirm("You have unpublished changes on this page. Leave without publishing?")) {
      e.target.value = S.path;
      return;
    }
    loadPage(e.target.value);
  });
  $("discard").addEventListener("click", () => {
    if (confirm("Discard your unpublished changes on this page?")) loadPage(S.path);
  });
  $("publish").addEventListener("click", publish);

  // ------------------------------------------------------------ page load
  function loadPage(path) {
    S.path = path;
    history.replaceState(null, "", `?page=${encodeURIComponent(path)}`);
    setDirty(false);
    S.files.clear();
    closePanel();
    status("Loading…");
    frame.onload = () => setupFrame().catch((err) => status(`Couldn't open this page: ${err.message}`));
    frame.src = path;
  }

  // Groups the page's DOM into one wrapper per section using the markers.
  function readMarkers(doc) {
    const main = doc.querySelector("main") || doc.body;
    const walker = doc.createTreeWalker(main, NodeFilter.SHOW_COMMENT);
    const markers = [];
    while (walker.nextNode()) {
      const m = walker.currentNode.data.match(/^arrange-(start|section|end) (.*)$/s);
      if (m) markers.push({ node: walker.currentNode, kind: m[1], data: JSON.parse(m[2]) });
    }
    const start = markers.find((m) => m.kind === "start");
    if (!start) return null;
    const sections = markers.filter((m) => m.kind === "section");
    const end = markers.find((m) => m.kind === "end");
    const wraps = sections.map((m, i) => {
      const wrap = doc.createElement("div");
      wrap.className = "arr-section";
      wrap.dataset.type = m.data.type;
      const stop = sections[i + 1]?.node || end?.node || null;
      let n = m.node.nextSibling;
      m.node.parentNode.insertBefore(wrap, m.node);
      while (n && n !== stop) {
        const next = n.nextSibling;
        wrap.append(n);
        n = next;
      }
      m.node.remove();
      return wrap;
    });
    return { info: start.data, wraps };
  }

  async function setupFrame() {
    const doc = frame.contentDocument;
    const found = readMarkers(doc);
    if (!found) {
      status("This page can't be arranged.");
      return;
    }
    S.info = { ...found.info, file: `${SITE_DIR}/${found.info.file}` };
    S.wraps = found.wraps;
    const { text, sha } = await readContent(S.info.file);
    S.data = JSON.parse(text);
    S.sha = sha;
    const saved = S.data[S.info.field];
    S.list = structuredClone(saved && saved.length ? saved : S.info.defaultLayout || []);
    // The live page must match the content, or edits could land in the wrong place.
    const live = S.wraps.map((w) => w.dataset.type).join(",");
    const content = S.list.map((s) => s.type).join(",");
    if (live !== content) {
      status("This page has changes that are still being published. Try again in a minute or two.");
      return;
    }
    injectStyles(doc);
    S.wraps.forEach(decorateSection);
    wireDocument(doc);
    status("");
  }

  // ------------------------------------------------------- page decoration
  function injectStyles(doc) {
    const style = doc.createElement("style");
    style.textContent = `
      .arr-section { position: relative; }
      .arr-section:hover { outline: 2px dashed rgba(37,99,235,.55); outline-offset: -2px; }
      .arr-section.arr-selected, .arr-inline.arr-selected { outline: 3px solid #2563eb; outline-offset: -3px; }
      .arr-tools { position: absolute; top: 8px; right: 8px; z-index: 60; display: none; gap: 4px; font: 13px system-ui, sans-serif; }
      .arr-section:hover > .arr-tools { display: flex; }
      .arr-tools button, .arr-tools span { background: #2563eb; color: #fff; border: 0; padding: 5px 9px; cursor: pointer; border-radius: 3px; }
      .arr-tools .arr-label { background: rgba(20,35,25,.85); cursor: default; }
      .arr-tools [draggable] { cursor: grab; }
      .arr-zone { position: relative; height: 0; z-index: 50; }
      .arr-zone::after { content: ""; position: absolute; left: 4%; right: 4%; top: -4px; height: 8px; background: rgba(37,99,235,.35); border-radius: 4px; transition: all .1s; }
      .arr-zone.arr-hot::after { background: #2563eb; top: -6px; height: 12px; box-shadow: 0 0 0 4px rgba(37,99,235,.2); }
      .arr-zone[data-kind="inline"]::after { left: 0; right: 0; }
      .arr-inline { cursor: pointer; }
      .arr-inline:hover { outline: 2px dashed rgba(37,99,235,.7); }
      .arr-media { cursor: pointer; }
      .arr-dragging * { pointer-events: none; }
      .arr-dragging .arr-zone { pointer-events: auto; }
      .arr-dragging .arr-zone::after { pointer-events: auto; }
    `;
    doc.head.append(style);
  }

  const MEDIA_TYPES = ["image", "video"];
  const TEXT_FIELDS = { text: "body", imageText: "body" };
  const labelOf = (s) =>
    ({
      hero: "Hero",
      pageHeader: "Title band",
      text: "Text",
      image: "Photo",
      video: "Video",
      imageText: "Photo/video + text",
      features: "Feature list",
      servicesGrid: "Services",
      faq: "FAQs",
      areas: "Service areas",
      gallery: "Gallery",
      reviews: "Reviews",
      contact: "Contact",
      cta: "Call/Book banner",
      map: "Map",
      spacer: "Space",
      servicePart: "Service page part",
      areaPart: "City page part",
    })[s.type] || s.type;

  function decorateSection(wrap) {
    const doc = wrap.ownerDocument;
    wrap.querySelector(":scope > .arr-tools")?.remove();
    const index = () => S.wraps.indexOf(wrap);
    const section = () => S.list[index()];
    const tools = doc.createElement("div");
    tools.className = "arr-tools";
    const label = doc.createElement("span");
    label.className = "arr-label";
    label.textContent = labelOf(section());
    const handle = doc.createElement("span");
    handle.textContent = "⠿ Move";
    handle.draggable = true;
    handle.title = "Drag to move this section";
    handle.addEventListener("dragstart", (e) => startDrag(e, { kind: "section", wrap }));
    handle.addEventListener("dragend", endDrag);
    const up = button(doc, "↑", "Move up", () => moveSection(index(), index() - 1));
    const down = button(doc, "↓", "Move down", () => moveSection(index(), index() + 2));
    tools.append(label, handle, up, down);
    if (MEDIA_TYPES.includes(section().type)) {
      tools.append(button(doc, "Edit", "Edit this photo/video", () => selectSection(wrap)));
      wrap.classList.add("arr-media");
      wrap.addEventListener("click", (e) => {
        if (e.target.closest(".arr-tools")) return;
        selectSection(wrap);
      });
    }
    wrap.prepend(tools);
    decorateText(wrap);
  }

  function button(doc, text, title, onClick) {
    const b = doc.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  // Paragraphs of a text field, as stored (blocks separated by blank lines).
  const blocksOf = (md) => (md || "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const isMediaBlock = (b) => /^\[\[(photo|video)\b/.test(b);

  // Marks text blocks so photos/videos can be dropped between paragraphs.
  function decorateText(wrap) {
    const s = S.list[S.wraps.indexOf(wrap)];
    const field = TEXT_FIELDS[s?.type];
    const rich = wrap.querySelector(".rich-text");
    if (!field || !rich) return;
    const kids = [...rich.children].filter((c) => !c.classList.contains("arr-zone"));
    const blocks = blocksOf(s[field]);
    // Only allow in-text drops when the page matches the text exactly.
    if (kids.length !== blocks.length) {
      rich.dataset.arrangeText = "off";
      return;
    }
    rich.dataset.arrangeText = field;
    kids.forEach((kid, i) => {
      if (isMediaBlock(blocks[i])) {
        kid.classList.add("arr-inline");
        kid.draggable = true;
        kid.onclick = (e) => {
          e.preventDefault();
          selectInline(kid);
        };
        kid.ondragstart = (e) => startDrag(e, { kind: "inline", el: kid });
        kid.ondragend = endDrag;
      }
    });
  }

  function wireDocument(doc) {
    // Stay on this page: links don't navigate while arranging.
    doc.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest("a");
        if (a) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
    doc.querySelectorAll("form").forEach((f) => f.addEventListener("submit", (e) => e.preventDefault()));
    // Files dragged in from the computer
    doc.addEventListener("dragenter", (e) => {
      if (!S.drag && [...(e.dataTransfer?.types || [])].includes("Files")) {
        S.drag = { kind: "file" };
        showZones(doc);
      }
    });
    doc.addEventListener("dragover", (e) => {
      if (!S.drag) return;
      e.preventDefault();
      const zone = nearestZone(doc, e.clientY, e.target);
      highlight(doc, zone);
    });
    doc.addEventListener("dragleave", (e) => {
      if (S.drag?.kind === "file" && !e.relatedTarget && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= doc.documentElement.clientWidth || e.clientY >= doc.documentElement.clientHeight)) endDrag();
    });
    doc.addEventListener("drop", (e) => {
      if (!S.drag) return;
      e.preventDefault();
      const zone = doc.querySelector(".arr-zone.arr-hot") || nearestZone(doc, e.clientY, e.target);
      const drag = S.drag;
      const files = [...(e.dataTransfer?.files || [])];
      endDrag();
      if (!zone) return;
      const target = zoneTarget(zone);
      if (drag.kind === "file") {
        if (files.length) addFile(files[0], target);
      } else moveItem(drag, target);
    });
  }

  // --------------------------------------------------------- drop zones
  function showZones(doc) {
    hideZones(doc);
    doc.body.classList.add("arr-dragging");
    const make = (kind, attrs) => {
      const z = doc.createElement("div");
      z.className = "arr-zone";
      z.dataset.kind = kind;
      Object.assign(z.dataset, attrs);
      return z;
    };
    S.wraps.forEach((wrap, i) => wrap.before(make("section", { at: i })));
    S.wraps.at(-1)?.after(make("section", { at: S.wraps.length }));
    S.wraps.forEach((wrap, i) => {
      const rich = wrap.querySelector(".rich-text");
      if (!rich || !TEXT_FIELDS[S.list[i]?.type] || rich.dataset.arrangeText === "off") return;
      const kids = [...rich.children];
      kids.forEach((kid, b) => kid.before(make("inline", { section: i, at: b })));
      rich.append(make("inline", { section: i, at: kids.length }));
    });
  }
  function hideZones(doc) {
    doc.querySelectorAll(".arr-zone").forEach((z) => z.remove());
    doc.body.classList.remove("arr-dragging");
  }
  function nearestZone(doc, y) {
    let best = null;
    let bestDist = Infinity;
    for (const z of doc.querySelectorAll(".arr-zone")) {
      const r = z.getBoundingClientRect();
      // Prefer in-text zones when the pointer is inside that text block.
      const inText = z.dataset.kind === "inline";
      const d = Math.abs(r.top - y) - (inText ? 6 : 0);
      if (d < bestDist) {
        bestDist = d;
        best = z;
      }
    }
    return best;
  }
  function highlight(doc, zone) {
    doc.querySelectorAll(".arr-zone.arr-hot").forEach((z) => z !== zone && z.classList.remove("arr-hot"));
    zone?.classList.add("arr-hot");
  }
  const zoneTarget = (z) =>
    z.dataset.kind === "section"
      ? { kind: "section", at: Number(z.dataset.at) }
      : { kind: "inline", section: Number(z.dataset.section), at: Number(z.dataset.at) };

  function startDrag(e, drag) {
    S.drag = drag;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "arrange");
    // Let the browser take its drag snapshot before zones change the layout.
    setTimeout(() => showZones(frame.contentDocument), 0);
  }
  function endDrag() {
    S.drag = null;
    if (frame.contentDocument) hideZones(frame.contentDocument);
  }

  // ---------------------------------------------------------- operations
  function moveSection(from, to) {
    if (from < 0 || from >= S.list.length) return;
    to = Math.max(0, Math.min(S.list.length, to));
    if (to === from || to === from + 1) return;
    const [item] = S.list.splice(from, 1);
    const [wrap] = S.wraps.splice(from, 1);
    const at = to > from ? to - 1 : to;
    S.list.splice(at, 0, item);
    S.wraps.splice(at, 0, wrap);
    const next = S.wraps[at + 1];
    if (next) next.before(wrap);
    else S.wraps[at - 1].after(wrap);
    wrap.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setDirty();
  }

  function insertSection(at, section, el) {
    const doc = frame.contentDocument;
    const wrap = doc.createElement("div");
    wrap.className = "arr-section";
    wrap.dataset.type = section.type;
    wrap.append(el);
    const ref = S.wraps[at];
    if (ref) ref.before(wrap);
    else if (S.wraps.length) S.wraps.at(-1).after(wrap);
    else (doc.querySelector("main") || doc.body).append(wrap);
    S.list.splice(at, 0, section);
    S.wraps.splice(at, 0, wrap);
    decorateSection(wrap);
    setDirty();
    return wrap;
  }

  function removeSection(i) {
    S.list.splice(i, 1);
    const [wrap] = S.wraps.splice(i, 1);
    wrap.remove();
    setDirty();
  }

  // Text-field helpers
  const textField = (i) => TEXT_FIELDS[S.list[i]?.type];
  function setBlocks(i, blocks) {
    S.list[i][textField(i)] = blocks.join("\n\n");
  }
  function richOf(i) {
    return S.wraps[i].querySelector(".rich-text");
  }
  function insertInline(i, at, shortcode, el) {
    const blocks = blocksOf(S.list[i][textField(i)]);
    blocks.splice(at, 0, shortcode);
    setBlocks(i, blocks);
    const rich = richOf(i);
    const kids = [...rich.children];
    if (kids[at]) kids[at].before(el);
    else rich.append(el);
    decorateText(S.wraps[i]);
    setDirty();
  }
  function inlinePosition(el) {
    const wrap = el.closest(".arr-section");
    const i = S.wraps.indexOf(wrap);
    const at = [...el.parentElement.children].indexOf(el);
    return { i, at };
  }
  function removeInline(el) {
    const { i, at } = inlinePosition(el);
    const blocks = blocksOf(S.list[i][textField(i)]);
    const [code] = blocks.splice(at, 1);
    setBlocks(i, blocks);
    el.remove();
    decorateText(S.wraps[i]);
    setDirty();
    return code;
  }

  // Shortcodes for media inside text (same format as public/admin/components.js)
  const attrs = (raw) => {
    const out = {};
    for (const m of (raw || "").matchAll(/([a-z]+)="([^"]*)"/g)) out[m[1]] = m[2].replace(/&quot;/g, '"');
    return out;
  };
  const parseCode = (code) => {
    const m = code.match(/^\[\[(photo|video)((?:\s+[a-z]+="[^"]*")*)\s*\]\]$/);
    return m ? { kind: m[1], a: attrs(m[2]) } : null;
  };
  const makeCode = (kind, a) =>
    `[[${kind}${Object.entries(a)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;").replace(/\n/g, " ")}"`)
      .join("")}]]`;

  // Conversions between a media section and an in-text photo/video
  function sectionToCode(s) {
    if (s.type === "image") return makeCode("photo", { src: s.image, alt: s.alt, caption: s.caption, size: "medium", align: "center" });
    if (s.type === "video" && s.source === "link") return makeCode("video", { url: s.url, caption: s.caption, size: "full", align: "center" });
    return makeCode("video", { src: s.file, poster: s.poster, playback: s.playback || "loop", caption: s.caption, size: "full", align: "center" });
  }
  function codeToSection(code) {
    const p = parseCode(code);
    if (!p) return null;
    if (p.kind === "photo") return { type: "image", image: p.a.src, alt: p.a.alt || "", caption: p.a.caption || "" };
    if (p.a.url) return { type: "video", source: "link", url: p.a.url, caption: p.a.caption || "" };
    return { type: "video", source: "upload", file: p.a.src, poster: p.a.poster || "", playback: p.a.playback || "loop", caption: p.a.caption || "" };
  }

  // ------------------------------------------------------ preview markup
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const previewSrc = (path) => S.previews?.get(path) || path;
  const sectionWidths = { narrow: "max-w-4xl", medium: "max-w-5xl", wide: "max-w-7xl", full: "max-w-none" };

  function sectionPreview(s) {
    const doc = frame.contentDocument;
    const el = doc.createElement("section");
    el.className = "py-20 lg:py-24";
    const media =
      s.type === "image"
        ? `<img src="${esc(previewSrc(s.image))}" alt="${esc(s.alt)}" class="w-full h-auto">`
        : s.source === "link"
          ? `<div class="relative aspect-video bg-moss-950" style="color:#e6d8b5;display:flex;align-items:center;justify-content:center">▶ ${esc(s.url)}</div>`
          : `<video src="${esc(previewSrc(s.file))}" class="w-full h-auto bg-moss-950" ${s.playback === "controls" ? "controls" : "autoplay muted loop"} playsinline></video>`;
    el.innerHTML = `<div class="${sectionWidths[s.width || "wide"]} mx-auto px-5 lg:px-8"><figure>${media}${
      s.caption ? `<figcaption class="mt-3 text-sm text-moss-600">${esc(s.caption)}</figcaption>` : ""
    }</figure></div>`;
    return el;
  }
  function inlinePreview(code) {
    const p = parseCode(code);
    const doc = frame.contentDocument;
    const size = ["small", "medium", "full"].includes(p.a.size) ? p.a.size : "medium";
    const align = ["left", "center", "right"].includes(p.a.align) ? p.a.align : "center";
    const fig = doc.createElement("figure");
    fig.className = `md-media md-${size} md-${align}`;
    fig.innerHTML =
      (p.kind === "photo"
        ? `<img src="${esc(previewSrc(p.a.src))}" alt="${esc(p.a.alt)}">`
        : p.a.url
          ? `<span class="md-embed" style="background:#0e1a14;color:#e6d8b5;display:flex;align-items:center;justify-content:center">▶ ${esc(p.a.url)}</span>`
          : `<video src="${esc(previewSrc(p.a.src))}" ${p.a.playback === "controls" ? "controls" : "autoplay muted loop"} playsinline></video>`) +
      (p.a.caption ? `<figcaption>${esc(p.a.caption)}</figcaption>` : "");
    return fig;
  }

  // ------------------------------------------------------- move existing
  function moveItem(drag, target) {
    if (drag.kind === "section") {
      const from = S.wraps.indexOf(drag.wrap);
      if (target.kind === "section") return moveSection(from, target.at);
      // A photo/video section dropped into text becomes an in-text photo/video
      const s = S.list[from];
      if (!MEDIA_TYPES.includes(s.type)) return alert("Only photos and videos can be placed inside text.");
      const code = sectionToCode(s);
      let { section: ti, at } = target;
      removeSection(from);
      if (ti > from) ti--;
      insertInline(ti, at, code, inlinePreview(code));
      return;
    }
    if (drag.kind === "inline") {
      const { i, at } = inlinePosition(drag.el);
      if (target.kind === "inline") {
        if (target.section === i && (target.at === at || target.at === at + 1)) return;
        const code = removeInline(drag.el);
        const to = target.section === i && target.at > at ? target.at - 1 : target.at;
        insertInline(target.section, to, code, inlinePreview(code));
      } else {
        const code = removeInline(drag.el);
        const s = codeToSection(code);
        insertSection(target.at, s, sectionPreview(s));
      }
    }
  }

  // ------------------------------------------------------- add new files
  const slug = (name) =>
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "upload";
  const rand = () => Math.random().toString(16).slice(2, 8);

  // Same as the site editor's upload setting: WebP, at most 2000px.
  async function toWebp(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
    return blob && blob.type === "image/webp" ? { blob, ext: "webp" } : { blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() };
  }

  function askDetails(kind, file) {
    return new Promise((resolve) => {
      const dlg = $("drop-dialog");
      $("drop-title").textContent = kind === "photo" ? "Add photo" : "Add video";
      $("drop-alt-row").hidden = kind !== "photo";
      $("d-alt").value = kind === "photo" ? file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : "";
      $("d-caption").value = "";
      $("drop-error").textContent = "";
      $("drop-note").textContent =
        kind === "video" && file.size > WARN_VIDEO ? `This video is ${(file.size / 1048576).toFixed(1)} MB. It will work, but smaller videos load faster for visitors.` : "";
      const url = URL.createObjectURL(file);
      $("drop-preview").innerHTML = kind === "photo" ? `<img src="${url}" alt="">` : `<video src="${url}" muted autoplay loop playsinline></video>`;
      const onClose = () => {
        dlg.removeEventListener("close", onClose);
        if (dlg.returnValue !== "ok") return resolve(null);
        resolve({ alt: $("d-alt").value.trim(), caption: $("d-caption").value.trim() });
      };
      $("drop-form").onsubmit = (e) => {
        if (e.submitter?.value === "ok" && kind === "photo" && !$("d-alt").value.trim()) {
          e.preventDefault();
          $("drop-error").textContent = "Please describe the photo in a few words.";
        }
      };
      dlg.addEventListener("close", onClose);
      dlg.returnValue = "";
      dlg.showModal();
      $("d-alt").focus();
    });
  }

  async function addFile(file, target) {
    const isImage = /^image\//.test(file.type);
    const isVideo = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
    if (!isImage && !isVideo) return alert("Please use a photo (JPG, PNG, WebP, HEIC) or an MP4 video.");
    if (isVideo && file.size > MAX_VIDEO) return alert("That video is larger than 25 MB, the most the site can host. Please shorten or compress it and try again.");
    const kind = isImage ? "photo" : "video";
    const details = await askDetails(kind, file);
    if (!details) return;
    status("Preparing…");
    let path;
    let publicPath;
    let blob = file;
    if (isImage) {
      const out = await toWebp(file).catch(() => ({ blob: file, ext: (file.name.split(".").pop() || "jpg").toLowerCase() }));
      blob = out.blob;
      const name = `${slug(file.name)}-${rand()}.${out.ext}`;
      path = `${IMAGE_FOLDER}/${name}`;
      publicPath = `/images/uploads/${name}`;
    } else {
      const name = `${slug(file.name)}-${rand()}.mp4`;
      path = `${VIDEO_FOLDER}/${name}`;
      publicPath = `/videos/${name}`;
    }
    S.files.set(path, blob);
    S.previews ??= new Map();
    S.previews.set(publicPath, URL.createObjectURL(blob));
    status("");
    if (target.kind === "section") {
      const s = isImage
        ? { type: "image", image: publicPath, alt: details.alt, caption: details.caption }
        : { type: "video", source: "upload", file: publicPath, playback: "loop", caption: details.caption };
      const wrap = insertSection(target.at, s, sectionPreview(s));
      selectSection(wrap);
    } else {
      const code = isImage
        ? makeCode("photo", { src: publicPath, alt: details.alt, caption: details.caption, size: "medium", align: "center" })
        : makeCode("video", { src: publicPath, playback: "loop", caption: details.caption, size: "full", align: "center" });
      const el = inlinePreview(code);
      insertInline(target.section, target.at, code, el);
      selectInline(el);
    }
  }

  // --------------------------------------------------------- media panel
  function clearSelection() {
    frame.contentDocument?.querySelectorAll(".arr-selected").forEach((el) => el.classList.remove("arr-selected"));
  }
  function closePanel() {
    clearSelection();
    S.selected = null;
    $("media-form").hidden = true;
    $("help").hidden = false;
  }
  function openPanel(kind, title, values, opts) {
    $("help").hidden = true;
    $("media-form").hidden = false;
    $("media-title").textContent = title;
    $("alt-row").hidden = !opts.alt;
    $("align-row").hidden = !opts.align;
    $("playback-row").hidden = !opts.playback;
    $("m-alt").value = values.alt || "";
    $("m-caption").value = values.caption || "";
    $("m-size").replaceChildren(...opts.sizes.map(([v, l]) => Object.assign(document.createElement("option"), { value: v, textContent: l })));
    $("m-size").value = values.size;
    $("m-align").value = values.align || "center";
    $("m-playback").value = values.playback || "loop";
    $("media-preview").innerHTML = opts.preview;
  }

  function selectSection(wrap) {
    clearSelection();
    wrap.classList.add("arr-selected");
    S.selected = { kind: "section", el: wrap };
    const s = S.list[S.wraps.indexOf(wrap)];
    openPanel(
      "section",
      s.type === "image" ? "Photo" : "Video",
      { alt: s.alt, caption: s.caption, size: s.width || "wide", playback: s.playback },
      {
        alt: s.type === "image",
        align: false,
        playback: s.type === "video" && s.source !== "link",
        sizes: [["narrow", "Narrow"], ["medium", "Medium"], ["wide", "Wide"], ["full", "Full width"]],
        preview: s.type === "image" ? `<img src="${esc(previewSrc(s.image))}" alt="">` : s.file ? `<video src="${esc(previewSrc(s.file))}" muted></video>` : "",
      }
    );
  }
  function selectInline(el) {
    clearSelection();
    el.classList.add("arr-selected");
    S.selected = { kind: "inline", el };
    const { i, at } = inlinePosition(el);
    const p = parseCode(blocksOf(S.list[i][textField(i)])[at]);
    openPanel(
      "inline",
      p.kind === "photo" ? "Photo in text" : "Video in text",
      { alt: p.a.alt, caption: p.a.caption, size: p.a.size || "medium", align: p.a.align, playback: p.a.playback },
      {
        alt: p.kind === "photo",
        align: true,
        playback: p.kind === "video" && !p.a.url,
        sizes: [["small", "Small"], ["medium", "Medium"], ["full", "Full width"]],
        preview: p.kind === "photo" ? `<img src="${esc(previewSrc(p.a.src))}" alt="">` : p.a.src ? `<video src="${esc(previewSrc(p.a.src))}" muted></video>` : "",
      }
    );
  }

  $("media-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const sel = S.selected;
    if (!sel) return;
    const alt = $("m-alt").value.trim();
    const caption = $("m-caption").value.trim();
    if (!$("alt-row").hidden && !alt) return alert("Please describe the photo in a few words.");
    if (sel.kind === "section") {
      const i = S.wraps.indexOf(sel.el);
      const s = S.list[i];
      Object.assign(s, { caption, width: $("m-size").value });
      if (s.type === "image") s.alt = alt;
      if (s.type === "video" && s.source !== "link") s.playback = $("m-playback").value;
      const fresh = sectionPreview(s);
      [...sel.el.childNodes].forEach((n) => !n.classList?.contains("arr-tools") && n.remove());
      sel.el.append(fresh);
    } else {
      const { i, at } = inlinePosition(sel.el);
      const blocks = blocksOf(S.list[i][textField(i)]);
      const p = parseCode(blocks[at]);
      Object.assign(p.a, { caption, size: $("m-size").value, align: $("m-align").value });
      if (p.kind === "photo") p.a.alt = alt;
      else if (!p.a.url) p.a.playback = $("m-playback").value;
      blocks[at] = makeCode(p.kind, p.a);
      setBlocks(i, blocks);
      const fresh = inlinePreview(blocks[at]);
      sel.el.replaceWith(fresh);
      decorateText(S.wraps[i]);
    }
    setDirty();
    closePanel();
  });
  $("m-delete").addEventListener("click", () => {
    const sel = S.selected;
    if (!sel || !confirm("Remove this from the page?")) return;
    if (sel.kind === "section") removeSection(S.wraps.indexOf(sel.el));
    else removeInline(sel.el);
    closePanel();
  });

  // ----------------------------------------------------------------- start
  (async () => {
    try {
      const cfg = await (await fetch("/admin/config.yml")).text();
      S.repo = (cfg.match(/^\s+repo:\s*([^\s#]+)/m) || [])[1] || "";
      S.branch = (cfg.match(/^\s+branch:\s*([^\s#]+)/m) || [])[1] || "main";
    } catch {}
    S.path = new URLSearchParams(location.search).get("page") || "/";
    await loadPageList();
    if (S.token) await signIn(S.token);
    else showSignedIn(false);
  })();
})();
