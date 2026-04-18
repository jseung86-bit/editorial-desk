// WSJ — 사이트 직접 접근은 401(봇 차단). 공식 RSS(feeds.a.dj.com)는 2025년까지만 업데이트.
// 현재 유효한 소스는 Google News RSS에서 "Opinion | ..." 프리픽스로 필터한 최신 editorial.
// (사용자 요청 URL /news/types/review-outlook-u-s는 401. "Review & Outlook" 포맷은
//  2010년대 중반 이후 현대 WSJ에서는 "Opinion |" 프리픽스로 대체됨.)
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { firstSentence, kstDate } from "../lib/extract.js";
import { sortRecent } from "../lib/recency.js";

const GN_RSS =
  "https://news.google.com/rss/search?q=site:wsj.com+%22editorial+board%22&hl=en-US&gl=US";

export default async function parse() {
  const xml = await politeFetch(GN_RSS);
  const $rss = load(xml, { xmlMode: true });
  const items = $rss("item")
    .toArray()
    .map((el) => {
      const $i = $rss(el);
      return {
        title: $i.find("title").first().text().trim(),
        link: $i.find("link").first().text().trim(),
        desc: $i.find("description").first().text().trim(),
        pub: $i.find("pubDate").first().text().trim(),
      };
    })
    // WSJ editorials are consistently titled "Opinion | <headline> - WSJ" on GN.
    .filter((it) => /^Opinion\s*\|/i.test(it.title));

  const fresh = sortRecent(items, 14);
  const pick = fresh[0];
  if (!pick) throw new Error("wsj: no recent 'Opinion |' editorial in Google News RSS");

  const title = pick.title
    .replace(/\s*-\s*(?:The\s+)?Wall Street Journal\s*$/i, "")
    .replace(/\s*-\s*WSJ\s*$/i, "")
    .replace(/^Opinion\s*\|\s*/i, "");
  const $d = load(`<div>${pick.desc}</div>`);
  const snippet = $d("div").text().trim().replace(/\s+/g, " ");
  const date = pick.pub ? new Date(pick.pub).toISOString().slice(0, 10) : kstDate();

  return {
    editorial: {
      title,
      kicker: "The Wall Street Journal · Editorial Board",
      byline: "THE EDITORIAL BOARD",
      body: snippet,
      pullQuote: firstSentence(snippet) || null,
      date,
      sourceUrl: pick.link,
      gated: true,
    },
  };
}
