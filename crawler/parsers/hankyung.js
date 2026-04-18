// 한국경제 — 공개. /opinion 랜딩에 [사설] 프리픽스 기사 링크 노출.
// 기사 URL 패턴: /article/{numeric-id}
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 링크 텍스트가 "[사설] ..."로 시작하는 것만 — 칼럼·오피니언 기사 제외.
  const entries = [];
  $list("a[href*='/article/']").each((_, el) => {
    const $a = $list(el);
    entries.push({ href: $a.attr("href"), text: $a.text().trim() });
  });
  const pick = entries.find((e) => /^\[사설\]/.test(e.text));
  const link = pick?.href ? absUrl(outletMeta.editorialUrl, pick.href) : null;
  if (!link) throw new Error("hankyung: no [사설] link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = (og.description || $('meta[name="description"]').attr("content") || "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    editorial: {
      title: (og.title || $("h1").first().text().trim())
        .replace(/\s*[-|ㅣ]\s*한국경제\s*$/i, "")
        .trim(),
      kicker: "한국경제 · 사설",
      byline: "사설",
      body,
      pullQuote: firstSentence(body),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
