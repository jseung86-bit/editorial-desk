// Chosun Ilbo — 공개. 리스트 HTML은 축소 버전으로 반환되어 RSS로 제목·링크만 수집.
// 본문은 완전 클라이언트 렌더라 SSR HTML에 존재하지 않음 — title + sourceUrl만 제공.
// 프론트엔드에서 본문 없을 때 "원문에서 읽기" CTA로 폴백.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, kstDate } from "../lib/extract.js";

const RSS = "https://www.chosun.com/arc/outboundfeeds/rss/category/opinion?outputType=xml";

export default async function parse() {
  const xml = await politeFetch(RSS);
  const $rss = load(xml, { xmlMode: true });
  const link = $rss("item")
    .map((_, el) => $rss(el).find("link").first().text().trim())
    .get()
    .find((h) => /\/opinion\/editorial\//.test(h));
  if (!link) throw new Error("chosun: no editorial item in RSS");

  // 기사 페이지에서 og:title만 받아온다. 본문은 React로 렌더되어 SSR에 없다.
  let title = "";
  try {
    const html = await politeFetch(link);
    const og = ogMeta(load(html));
    title = og.title || "";
  } catch {
    // fetch 실패해도 RSS의 링크는 유지
  }

  return {
    editorial: {
      title,
      kicker: "조선일보 · 사설",
      byline: "사설 · 논설위원실",
      body: "", // SSR HTML에 본문 없음 — 원문 링크 제공
      pullQuote: null,
      date: kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
