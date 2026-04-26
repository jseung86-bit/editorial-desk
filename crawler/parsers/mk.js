// 매일경제 — 공개. /opinion 랜딩에 editorial 링크가 /news/editorial/{id} 패턴으로 노출.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const allHrefs = $list("a[href]")
    .map((_, el) => $list(el).attr("href"))
    .get()
    .filter((h) => /\/news\/editorial\/\d+/.test(h));
  const uniqHrefs = [...new Set(allHrefs)].slice(0, 5);
  if (!uniqHrefs.length) throw new Error("mk: no editorial links found");

  const cutoff = Date.now() - 24 * 3600 * 1000;
  const fetched = await Promise.all(uniqHrefs.map(async (href) => {
    const link = absUrl(outletMeta.editorialUrl, href);
    try {
      const html = await politeFetch(link);
      const $ = load(html);
      const og = ogMeta($);
      const body = (og.description || $('meta[name="description"]').attr("content") || "")
        .replace(/\s+/g, " ")
        .trim();
      const title = (og.title || $("h1").first().text().trim())
        .replace(/\s*[-|ㅣ]\s*매일경제\s*$/i, "")
        .replace(/\s*\[사설\]\s*$/i, "")
        .replace(/^\s*\[사설\]\s*/i, "")
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
  if (!picks.length) throw new Error("mk: no fetchable editorials");

  return {
    editorials: picks.map((p) => ({
      title: p.title,
      kicker: "매일경제 · 사설",
      byline: "사설",
      body: p.body,
      pullQuote: firstSentence(p.body),
      date: p.date,
      sourceUrl: p.link,
      gated: false,
    })),
  };
}
