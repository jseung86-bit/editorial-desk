// NYT — PAYWALL. Try RSS first (opinion editorials feed), fall back to og meta.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, absUrl, kstDate } from "../lib/extract.js";

const RSS = "https://rss.nytimes.com/services/xml/rss/nyt/Editorials.xml";

export default async function parse({ outletMeta }) {
  let link = outletMeta.editorialUrl;
  let rssTitle = null;
  let rssDesc = null;
  try {
    const xml = await politeFetch(RSS);
    const $ = load(xml, { xmlMode: true });
    const item = $("item").first();
    link = item.find("link").text().trim() || link;
    rssTitle = item.find("title").text().trim() || null;
    rssDesc = item.find("description").text().trim() || null;
  } catch {
    /* fall through to og meta */
  }

  let og = {};
  try {
    og = ogMeta(load(await politeFetch(link)));
  } catch {
    /* paywall block */
  }

  return {
    editorial: {
      title: rssTitle || og.title || "(See NYT Opinion — Editorials)",
      kicker: "The New York Times · Opinion · Editorial Board",
      byline: "THE EDITORIAL BOARD",
      body: rssDesc || og.description || "",
      pullQuote: rssDesc || og.description || null,
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: true,
    },
  };
}
