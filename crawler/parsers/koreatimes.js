// Korea Times — 공개. 리뉴얼 후 /www/opinion/editorial.html → /opinion/editorial.
// 기사 URL 패턴: /opinion/editorial/YYYYMMDD/ed-<slug>
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 날짜가 포함된 경로만 기사. 루트(/opinion/editorial) 자기 링크는 걸러진다.
  // /opinion/editorial/ 뒤에 segment가 하나라도 더 있으면 기사. 날짜 형식이 바뀌어도 견딘다.
  const href = $list("a[href]")
    .map((_, el) => $list(el).attr("href"))
    .get()
    .find((h) => /\/opinion\/editorial\/[^\/]+\//.test(h));
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("koreatimes: no editorial article link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const body = articleText($, "#articleBody p, .article-body p, .view-content p, article p");
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
