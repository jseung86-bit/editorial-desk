// Small helpers shared across parsers.

/** Extract og:* meta tags from a cheerio-loaded document. */
export function ogMeta($) {
  const get = (prop) =>
    $(`meta[property='${prop}']`).attr("content") ||
    $(`meta[name='${prop}']`).attr("content") ||
    null;
  return {
    title: get("og:title"),
    description: get("og:description"),
    image: get("og:image"),
    url: get("og:url"),
    siteName: get("og:site_name"),
    publishedAt:
      get("article:published_time") ||
      get("og:published_time") ||
      $("time[datetime]").first().attr("datetime") ||
      null,
  };
}

/** Concatenate the body paragraphs of an article element. */
export function articleText($, selector = "article p, .article-body p, .view-text p") {
  return $(selector)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull the first 1–2 sentences to act as a pull quote when we have nothing better. */
export function firstSentence(text, { maxLen = 160 } = {}) {
  if (!text) return null;
  const m = text.match(/[^.!?。！？]+[.!?。！？]/);
  const s = (m ? m[0] : text).trim();
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}

/** Make an absolute URL from a possibly-relative href. */
export function absUrl(base, href) {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Today in KST, as YYYY-MM-DD. */
export function kstDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return kst.toISOString().slice(0, 10);
}
