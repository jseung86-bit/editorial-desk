// WSJ — PAYWALL + 강한 봇 차단. 본문 재게시 금지.
// 사이트 자체(리스트·기사)는 Actions IP로 401. Google News RSS로 "The Editorial Board"
// 게시물을 찾아 제목 + 스니펫만 수집. 본문은 저장하지 않음(정책) — 링크만 제공.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { firstSentence, kstDate } from "../lib/extract.js";

const GN_RSS =
  "https://news.google.com/rss/search?q=site:wsj.com+%22editorial+board%22&hl=en-US&gl=US";

export default async function parse() {
  let title = "The Wall Street Journal · Opinion";
  let link = "https://www.wsj.com/opinion";
  let snippet = "";
  let date = kstDate();

  try {
    const xml = await politeFetch(GN_RSS);
    const $rss = load(xml, { xmlMode: true });
    const items = $rss("item").toArray();
    // 최상단이 The Editorial Board 글이 아닐 수도 있으니 가능한 한 editorial 계열 우선.
    const pick =
      items.find((el) => {
        const t = $rss(el).find("title").first().text();
        return /editorial board|\beditorial\b/i.test(t);
      }) || items[0];
    if (pick) {
      const $i = $rss(pick);
      const rawTitle = $i.find("title").first().text().trim();
      title = rawTitle.replace(/\s*-\s*The Wall Street Journal\s*$/, "");
      link = $i.find("link").first().text().trim() || link;
      const descHtml = $i.find("description").first().text().trim();
      const $d = load(`<div>${descHtml}</div>`);
      snippet = $d("div").text().trim().replace(/\s+/g, " ");
      const pubDate = $i.find("pubDate").first().text().trim();
      if (pubDate) date = new Date(pubDate).toISOString().slice(0, 10);
    }
  } catch {
    // Google News 실패 — placeholder 카드로.
  }

  return {
    editorial: {
      title,
      kicker: "The Wall Street Journal · Editorial Board",
      byline: "THE EDITORIAL BOARD",
      body: snippet,
      pullQuote: firstSentence(snippet) || null,
      date,
      sourceUrl: link,
      gated: true,
    },
  };
}
