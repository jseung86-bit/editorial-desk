// Korea Times — 공개
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const href =
    $list(".list a, article a, a[href*='/www/opinion/']").first().attr("href");
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("koreatimes: no editorial link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = articleText($, "#articleBody p, .view-content p, article p");
  return {
    editorial: {
      title: og.title || $("h1").first().text().trim(),
      kicker: null,
      byline: "EDITORIAL",
      body,
      pullQuote: firstSentence(body),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
