// Hankook Ilbo — 공개. 사설 리스트 URL이 2026 리뉴얼로 /Collection/7340 → /news/opinion/editorial 로 이동.
// 기사 URL 패턴: /news/article/A{17~20자리 숫자}
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // URL 경로 패턴을 1차 — 마크업 클래스명보다 안정적이다.
  const href =
    $list("a[href*='/news/article/A']").first().attr("href") ||
    $list("a[href*='/News/Read/']").first().attr("href");
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("hankook: no editorial link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = articleText($, ".article-cont p, .article-body p, article p, .view-text p");
  return {
    editorial: {
      title: og.title || $("h1").first().text().trim(),
      kicker: null,
      byline: "사설",
      body,
      pullQuote: firstSentence(body),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
