// Korea Herald — 공개. /Opinion/Editorial 페이지에서 [Editorial] 프리픽스 기사만 필터.
// 기사 URL 패턴: /article/{numeric-id}
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const entries = [];
  $list("a[href*='/article/']").each((_, el) => {
    const $a = $list(el);
    entries.push({ href: $a.attr("href"), text: $a.text().trim() });
  });
  // [Editorial] 프리픽스 항목들만 수집, 중복 제거
  const editorialEntries = entries.filter((e) => /^\[Editorial\]/i.test(e.text));
  const uniqHrefs = [...new Set(editorialEntries.map((e) => e.href))].filter(Boolean);
  const pickHrefs = uniqHrefs.length
    ? uniqHrefs.slice(0, 5)
    : (entries[0]?.href ? [entries[0].href] : []);
  if (!pickHrefs.length) throw new Error("heraldcorp: no [Editorial] link found");

  const cutoff = Date.now() - 24 * 3600 * 1000;
  const fetched = await Promise.all(pickHrefs.map(async (href) => {
    const link = absUrl(outletMeta.editorialUrl, href);
    try {
      const html = await politeFetch(link);
      const $ = load(html);
      const og = ogMeta($);
      const body = articleText($, ".news-content p, article p, .article-text p");
      const title = (og.title || $("h1").first().text().trim())
        .replace(/^\[Editorial\]\s*/i, "")
        .replace(/\s*-\s*The Korea Herald\s*$/i, "")
        .trim();
      const publishedMs = og.publishedAt ? Date.parse(og.publishedAt) : 0;
      return {
        link, title, body, publishedMs,
        date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      };
    } catch {
      return null;
    }
  }));
  const within24h = fetched.filter((c) => c && c.publishedMs >= cutoff);
  const picks = (within24h.length ? within24h : fetched.filter(Boolean).slice(0, 1)).slice(0, 3);
  if (!picks.length) throw new Error("heraldcorp: no fetchable [Editorial] articles");

  return {
    editorials: picks.map((p) => ({
      title: p.title,
      kicker: "The Korea Herald · Editorial",
      byline: "EDITORIAL",
      body: p.body,
      pullQuote: firstSentence(p.body),
      date: p.date,
      sourceUrl: p.link,
      gated: false,
    })),
  };
}
