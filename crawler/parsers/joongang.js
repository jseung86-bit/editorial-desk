// JoongAng — 공개. /opinion 섹션에서 '사설' 카테고리 첫 항목을 찾는다.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const href =
    $list("a[href*='/article/']").filter((_, el) =>
      /사설/.test($list(el).closest("li,article,div").text()),
    ).first().attr("href") ||
    $list("a[href*='/article/']").first().attr("href");
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("joongang: no editorial link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = articleText($, "#article_body p, .article_body p, article p");
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
