// Chosun Ilbo — 공개. 기사 URL 패턴: /opinion/editorial/YYYY/MM/DD/{22자리 ID}/
// 기존 셀렉터는 /opinion/editorial/ 자기 링크(메뉴)까지 매칭돼 리스트 페이지를 기사로 오인했다.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 날짜가 포함된 경로만 기사. 루트(/opinion/editorial/) 자기 링크는 걸러진다.
  const href = $list("a[href]")
    .map((_, el) => $list(el).attr("href"))
    .get()
    .find((h) => /\/opinion\/editorial\/\d{4}\/\d{2}\/\d{2}\//.test(h));
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("chosun: no editorial article link found");

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
