// FT — PAYWALL. FT editorial column is "The FT View". RSS fallback.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, absUrl, kstDate } from "../lib/extract.js";

const RSS = "https://www.ft.com/opinion?format=rss";

export default async function parse({ outletMeta }) {
  let link = outletMeta.editorialUrl;
  let rssTitle = null;
  let rssDesc = null;
  try {
    const xml = await politeFetch(RSS);
    const $ = load(xml, { xmlMode: true });
    // pick first item whose title/category hints at "FT View" / editorial
    const items = $("item").toArray();
    const pick =
      items.find((el) => /FT View|editorial|leader/i.test($(el).text())) ||
      items[0];
    if (pick) {
      const $i = $(pick);
      link = $i.find("link").text().trim() || link;
      rssTitle = $i.find("title").text().trim() || null;
      rssDesc = $i.find("description").text().trim() || null;
    }
  } catch {
    /* fall through */
  }

  let og = {};
  try {
    og = ogMeta(load(await politeFetch(link)));
  } catch {
    /* paywall */
  }

  return {
    editorial: {
      title: rssTitle || og.title || "(See FT Opinion — The FT View)",
      kicker: "Financial Times · The FT View",
      byline: "THE EDITORIAL BOARD",
      body: rssDesc || og.description || "",
      pullQuote: rssDesc || og.description || null,
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: true,
    },
  };
}
