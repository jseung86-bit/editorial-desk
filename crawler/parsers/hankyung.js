// 한국경제 — 공개. /opinion 랜딩에 [사설] 프리픽스 기사 링크 노출.
// 기사 URL 패턴: /article/{numeric-id}
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 링크 텍스트가 "[사설] ..."로 시작하는 것들만 수집 — 칼럼·오피니언 기사 제외.
  const entries = [];
  $list("a[href*='/article/']").each((_, el) => {
    const $a = $list(el);
    entries.push({ href: $a.attr("href"), text: $a.text().trim() });
  });
  const saseolEntries = entries.filter((e) => /^\[사설\]/.test(e.text));
  const uniqHrefs = [...new Set(saseolEntries.map((e) => e.href))].filter(Boolean).slice(0, 5);
  if (!uniqHrefs.length) throw new Error("hankyung: no [사설] links found");

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
        .replace(/\s*[-|ㅣ]\s*한국경제\s*$/i, "")
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
  if (!picks.length) throw new Error("hankyung: no fetchable [사설] articles");

  return {
    editorials: picks.map((p) => ({
      title: p.title,
      kicker: "한국경제 · 사설",
      byline: "사설",
      body: p.body,
      pullQuote: firstSentence(p.body),
      date: p.date,
      sourceUrl: p.link,
      gated: false,
    })),
  };
}
