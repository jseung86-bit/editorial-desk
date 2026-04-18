// Chosun Ilbo — 공개 사설
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // Chosun editorial list: anchor to the top editorial. Selector is best-effort —
  // update when the markup drifts.
  const href =
    $list("a[href*='/opinion/editorial/']").first().attr("href") ||
    $list("article a").first().attr("href");
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("chosun: no editorial link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = articleText($, "article p, .article-body p, #fusion-app p");
  return {
    editorial: {
      title: og.title || $("h1").first().text().trim(),
      kicker: null,
      byline: "사설 · 논설위원실",
      body,
      pullQuote: firstSentence(body),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
