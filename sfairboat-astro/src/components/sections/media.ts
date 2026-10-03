// Turns a YouTube or Vimeo link into an embeddable player URL.
export function embedUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
    }
    if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const vid = u.pathname.match(/(\d+)/)?.[1];
      if (vid) return `https://player.vimeo.com/video/${vid}`;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}
