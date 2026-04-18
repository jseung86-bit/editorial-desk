// 매일경제 — 공개. /opinion 랜딩에 editorial 링크가 /news/editorial/{id} 패턴으로 노출.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const href = $list("a[href]")
    .map((_, el) => $list(el).attr("href"))
    .get()
    .find((h) => /\/news\/editorial\/\d+/.test(h));
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("mk: no editorial link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = (og.description || $('meta[name="description"]').attr("content") || "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    editorial: {
      title: (og.title || $("h1").first().text().trim())
        .replace(/\s*[-|ㅣ]\s*매일경제\s*$/i, "")
        .trim(),
      kicker: "매일경제 · 사설",
      byline: "사설",
      body,
      pullQuote: firstSentence(body),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
