// WSJ — PAYWALL. og:title + og:description만 저장. 본문 재게시 금지.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const href = $list("a[href*='/articles/']").first().attr("href");
  const link = absUrl(outletMeta.editorialUrl, href) || outletMeta.editorialUrl;

  let og = {};
  try {
    const html = await politeFetch(link);
    og = ogMeta(load(html));
  } catch {
    // paywall often blocks bots — still produce a gated card.
  }

  return {
    editorial: {
      title: og.title || "(See WSJ opinion page)",
      kicker: og.siteName || "The Wall Street Journal · Opinion",
      byline: "THE EDITORIAL BOARD",
      body: og.description || "",
      pullQuote: og.description || null,
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: true,
    },
  };
}
