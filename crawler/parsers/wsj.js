// WSJ — PAYWALL. 본문 재게시 금지. og:title + og:description만 저장.
// WSJ는 봇 차단이 강해서 리스트 페이지 fetch 자체가 401로 막히는 경우가 많음.
// fetch 실패해도 gated 카드는 반드시 생산해야 data.js에서 자리를 유지한다.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  let link = outletMeta.editorialUrl;
  let og = {};

  try {
    const listHtml = await politeFetch(outletMeta.editorialUrl);
    const $list = load(listHtml);
    const href = $list("a[href*='/articles/']").first().attr("href");
    link = absUrl(outletMeta.editorialUrl, href) || link;
  } catch {
    // 봇 차단 — 리스트 페이지도 못 열어봤으면 opinion 허브를 그대로 링크로 쓴다.
  }

  try {
    const html = await politeFetch(link);
    og = ogMeta(load(html));
  } catch {
    // 기사 페이지도 차단 — og 메타 없이 플레이스홀더 카드로 간다.
  }

  return {
    editorial: {
      title: og.title || "The Wall Street Journal · Opinion",
      kicker: og.siteName || "The Wall Street Journal · Opinion",
      byline: "THE EDITORIAL BOARD",
      body: og.description || "",
      pullQuote: og.description || null,
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: true,
    },
  };
}
