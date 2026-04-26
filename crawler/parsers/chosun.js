// Chosun Ilbo — 기사 본문이 React 클라이언트 렌더라 일반적으로 SSR HTML에 없다.
// 하지만 <meta name="description">에는 본문 첫 ~150자 요약이 서버에서 주입되므로 활용.
// RSS에서 최신 사설 링크를 찾고, 기사 페이지의 meta description을 body로 삼는다.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, kstDate } from "../lib/extract.js";
import { pickLast24h, sortRecent } from "../lib/recency.js";

const RSS = "https://www.chosun.com/arc/outboundfeeds/rss/category/opinion?outputType=xml";

export default async function parse() {
  const xml = await politeFetch(RSS);
  const $rss = load(xml, { xmlMode: true });
  const items = $rss("item")
    .toArray()
    .map((el) => {
      const $i = $rss(el);
      return {
        title: $i.find("title").first().text().trim(),
        link: $i.find("link").first().text().trim(),
        pub: $i.find("pubDate").first().text().trim(),
      };
    })
    .filter((it) => /\/opinion\/editorial\//.test(it.link));

  // Multi-editorial: pick all items in last 24h, capped at 3.
  // Fallback: if 24h window is empty (rare — pubDate parsing edge), take freshest single.
  let picks = pickLast24h(items, 3);
  if (!picks.length) {
    const fresh = sortRecent(items, 14);
    picks = fresh.slice(0, 1);
  }
  if (!picks.length) throw new Error("chosun: no editorial items in RSS");

  const editorials = await Promise.all(picks.map(async (pick) => {
    let title = pick.title || "";
    let body = "";
    try {
      const html = await politeFetch(pick.link);
      const $ = load(html);
      const og = ogMeta($);
      title = og.title || title;
      const metaDesc = $('meta[name="description"]').attr("content") || "";
      const cleaned = metaDesc.replace(/\s+/g, " ").trim();
      const bodyStart = cleaned.replace(/^사설\s+/, "").replace(/^[^\s]{0,80}?\s{2,}/, "");
      body = bodyStart || cleaned;
    } catch {
      // 접근 실패하면 RSS 제목만 유지
    }
    return {
      title,
      kicker: "조선일보 · 사설",
      byline: "사설 · 논설위원실",
      body,
      pullQuote: firstSentence(body),
      date: pick.pub ? new Date(pick.pub).toISOString().slice(0, 10) : kstDate(),
      sourceUrl: pick.link,
      gated: false,
    };
  }));

  return { editorials };
}
