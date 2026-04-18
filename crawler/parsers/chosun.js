// Chosun Ilbo — 공개. 리스트 HTML은 GitHub Actions IP로 접근 시 날짜 포함 기사 링크가
// 빠진 축소 버전을 보낸다. RSS 엔드포인트는 서버 렌더 XML이라 안정적.
// 기사 URL 패턴: /opinion/editorial/YYYY/MM/DD/{22자리 ID}/
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, articleText, firstSentence, kstDate } from "../lib/extract.js";

const RSS = "https://www.chosun.com/arc/outboundfeeds/rss/category/opinion?outputType=xml";

export default async function parse({ outletMeta }) {
  const xml = await politeFetch(RSS);
  const $rss = load(xml, { xmlMode: true });
  // opinion 카테고리에는 editorial + manmulsang + 칼럼이 섞여 있음.
  // editorial 경로 패턴으로 필터링.
  const link = $rss("item link, item")
    .map((_, el) => $rss(el).text().trim() || $rss(el).find("link").text().trim())
    .get()
    .find((h) => /\/opinion\/editorial\//.test(h));
  if (!link) throw new Error("chosun: no editorial item in RSS");

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
