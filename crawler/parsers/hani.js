// 한겨레 — 공개. /arti/opinion/editorial 리스트 → 최상단 기사 → og:description을 body로.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 기사 URL 패턴: /arti/opinion/editorial/{numeric-id}.html
  const href = $list("a[href]")
    .map((_, el) => $list(el).attr("href"))
    .get()
    .find((h) => /\/arti\/opinion\/editorial\/\d+\.html/.test(h));
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("hani: no editorial article link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = (og.description || $('meta[name="description"]').attr("content") || "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    editorial: {
      title: (og.title || $("h1").first().text().trim())
        .replace(/\s*[|ㅣ]\s*한겨레\s*$/i, "")
        .trim(),
      kicker: "한겨레 · 사설",
      byline: "사설",
      body,
      pullQuote: firstSentence(body),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
