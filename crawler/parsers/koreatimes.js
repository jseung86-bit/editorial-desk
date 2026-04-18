// Korea Times — 공개지만 AWS WAF가 GitHub Actions IP 대역을 자동 차단한다.
// 리스트/기사 모두 JS challenge 페이지가 반환되므로 Google News RSS로 우회.
// 본문을 수집할 수 없어 gated 카드(제목 + 링크 + 스니펫)로 렌더한다.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { firstSentence, kstDate } from "../lib/extract.js";

const GN_RSS =
  "https://news.google.com/rss/search?q=site:koreatimes.co.kr/opinion/editorial&hl=en-US&gl=US";

export default async function parse() {
  const xml = await politeFetch(GN_RSS);
  const $rss = load(xml, { xmlMode: true });
  const items = $rss("item").toArray();
  // Korea Times는 사설 제목을 "[ED] ..." 로 프리픽스한다 — 칼럼·오피니언과 구분되는 마커.
  const pick =
    items.find((el) => /\[ED\]/i.test($rss(el).find("title").first().text())) || items[0];
  if (!pick) throw new Error("koreatimes: no editorial item in Google News RSS");

  const $i = $rss(pick);
  const rawTitle = $i.find("title").first().text().trim();
  const title = rawTitle.replace(/\s*-\s*The Korea Times\s*$/, "").replace(/^\[ED\]\s*/, "");
  const link = $i.find("link").first().text().trim();
  const pubDate = $i.find("pubDate").first().text().trim();
  // description은 Google의 HTML 래퍼. 안쪽 텍스트만 추출.
  const descHtml = $i.find("description").first().text().trim();
  const $d = load(`<div>${descHtml}</div>`);
  const snippet = $d("div").text().trim().replace(/\s+/g, " ");
  const date = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : kstDate();

  return {
    editorial: {
      title,
      kicker: "The Korea Times · Editorial",
      byline: "EDITORIAL",
      body: snippet,
      pullQuote: firstSentence(snippet) || title,
      date,
      sourceUrl: link,
      gated: true,
    },
  };
}
