// 한겨레 — 공개. /arti/opinion/editorial 리스트 → 최상단 기사 → og:description을 body로.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 사설 URL 패턴: /arti/opinion/editorial/{numeric-id}.html. 리스트 상단 N개를 모두 후보로.
  // 한겨레 리스트는 시간순 DESC라 상위 3개를 꺼낸 뒤 og:publishedAt으로 24h 내 필터.
  const allHrefs = $list("a[href]")
    .map((_, el) => $list(el).attr("href"))
    .get()
    .filter((h) => /\/arti\/opinion\/editorial\/\d+\.html/.test(h));
  // 중복 제거 (같은 기사 여러 곳 링크)
  const uniq = [...new Set(allHrefs)].slice(0, 5);
  if (!uniq.length) throw new Error("hani: no editorial article links found");

  const cutoff = Date.now() - 24 * 3600 * 1000;
  const candidates = await Promise.all(uniq.map(async (href) => {
    const link = absUrl(outletMeta.editorialUrl, href);
    try {
      const html = await politeFetch(link);
      const $ = load(html);
      const og = ogMeta($);
      const body = (og.description || $('meta[name="description"]').attr("content") || "")
        .replace(/\s+/g, " ")
        .trim();
      const title = (og.title || $("h1").first().text().trim())
        .replace(/\s*[|ㅣ]\s*한겨레\s*$/i, "")
        .trim();
      const publishedMs = og.publishedAt ? Date.parse(og.publishedAt) : 0;
      return {
        link, title, body,
        publishedMs,
        date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      };
    } catch {
      return null;
    }
  }));

  // 24h 내 항목만 (pub 파싱 가능한 경우). 파싱 안 되면 첫 번째만 반환 (폴백).
  const within24h = candidates.filter((c) => c && c.publishedMs >= cutoff);
  let picks = within24h.length ? within24h.slice(0, 3) : candidates.filter(Boolean).slice(0, 1);
  if (!picks.length) throw new Error("hani: no fetchable editorial articles");

  return {
    editorials: picks.map((p) => ({
      title: p.title,
      kicker: "한겨레 · 사설",
      byline: "사설",
      body: p.body,
      pullQuote: firstSentence(p.body),
      date: p.date,
      sourceUrl: p.link,
      gated: false,
    })),
  };
}
