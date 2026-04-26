// JoongAng — 공개. /opinion 섹션에서 '사설' 카테고리 항목들을 찾는다 (24h 윈도우).
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // '사설' 컨테이너 안의 article 링크들을 모두 수집. 부모 요소에 "사설" 텍스트가 있는 것만.
  const saseolHrefs = [];
  $list("a[href*='/article/']").each((_, el) => {
    const $a = $list(el);
    const href = $a.attr("href");
    if (!href) return;
    if (/사설/.test($a.closest("li,article,div").text())) {
      saseolHrefs.push(href);
    }
  });
  // 폴백: '사설' 매칭이 없으면 그냥 article 링크 첫 개
  let candidateHrefs = [...new Set(saseolHrefs)];
  if (!candidateHrefs.length) {
    const first = $list("a[href*='/article/']").first().attr("href");
    if (first) candidateHrefs = [first];
  }
  if (!candidateHrefs.length) throw new Error("joongang: no editorial links found");

  // 상위 5개까지 fetch한 뒤 publishedAt으로 24h 필터.
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const fetched = await Promise.all(candidateHrefs.slice(0, 5).map(async (href) => {
    const link = absUrl(outletMeta.editorialUrl, href);
    try {
      const html = await politeFetch(link);
      const $ = load(html);
      const og = ogMeta($);
      const body = articleText($, "#article_body p, .article_body p, article p");
      const rawTitle = og.title || $("h1").first().text().trim();
      const cleanTitle = rawTitle
        .replace(/\s*[|ㅣ]\s*중앙일보\s*$/i, "")
        .replace(/\s*-\s*중앙일보\s*$/i, "")
        .trim();
      const publishedMs = og.publishedAt ? Date.parse(og.publishedAt) : 0;
      return {
        link, title: cleanTitle, body, publishedMs,
        date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      };
    } catch {
      return null;
    }
  }));
  const within24h = fetched.filter((c) => c && c.publishedMs >= cutoff);
  const picks = (within24h.length ? within24h : fetched.filter(Boolean).slice(0, 1)).slice(0, 3);
  if (!picks.length) throw new Error("joongang: no fetchable articles");

  return {
    editorials: picks.map((p) => ({
      title: p.title,
      kicker: null,
      byline: "사설",
      body: p.body,
      pullQuote: firstSentence(p.body),
      date: p.date,
      sourceUrl: p.link,
      gated: false,
    })),
  };
}
