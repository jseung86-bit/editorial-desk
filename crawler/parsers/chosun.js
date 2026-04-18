// Chosun Ilbo — 기사 본문이 React 클라이언트 렌더라 일반적으로 SSR HTML에 없다.
// 하지만 <meta name="description">에는 본문 첫 ~150자 요약이 서버에서 주입되므로 활용.
// RSS에서 최신 사설 링크를 찾고, 기사 페이지의 meta description을 body로 삼는다.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, kstDate } from "../lib/extract.js";
import { sortRecent } from "../lib/recency.js";

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

  const fresh = sortRecent(items, 14);
  const pick = fresh[0] || items[0];
  if (!pick?.link) throw new Error("chosun: no editorial item in RSS");
  const link = pick.link;

  // 기사 페이지에서 og:title + meta name=description을 받아온다.
  let title = pick.title || "";
  let body = "";
  try {
    const html = await politeFetch(link);
    const $ = load(html);
    const og = ogMeta($);
    title = og.title || title;
    // og:description은 제목만 반복되는 경우가 많음. name=description이 본문 인트로.
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const cleaned = metaDesc.replace(/\s+/g, " ").trim();
    // 앞쪽의 제목 반복 제거: "사설 <제목>  <본문...>" → 본문만
    const bodyStart = cleaned.replace(/^사설\s+/, "").replace(/^[^\s]{0,80}?\s{2,}/, "");
    body = bodyStart || cleaned;
  } catch {
    // 접근 실패하면 RSS 제목만 유지
  }

  return {
    editorial: {
      title,
      kicker: "조선일보 · 사설",
      byline: "사설 · 논설위원실",
      body,
      pullQuote: firstSentence(body),
      date: pick.pub ? new Date(pick.pub).toISOString().slice(0, 10) : kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
