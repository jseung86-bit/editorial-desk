// Korea Times — 1차: 실제 사이트(/opinion/editorial) 리스트에서 최신 기사 직접 수집.
//   AWS WAF가 Actions IP를 JS challenge로 차단할 때가 많지만, 차단 패턴이 일정치 않아
//   가끔 관통되며, 그때는 Google News RSS보다 최신성이 훨씬 정확하다.
// 2차: 차단/파싱 실패 시 Google News RSS `[ED]` 프리픽스 + pubDate DESC + 최근 14일.
//   GN은 색인 지연 때문에 오늘·어제 사설이 누락되곤 하므로 어디까지나 폴백.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { firstSentence, absUrl, kstDate } from "../lib/extract.js";
import { sortRecent } from "../lib/recency.js";

const LIST_URL = "https://www.koreatimes.co.kr/opinion/editorial";
const GN_RSS =
  "https://news.google.com/rss/search?q=site:koreatimes.co.kr/opinion/editorial&hl=en-US&gl=US";

export default async function parse() {
  // --- 1차: KT 사이트 직접 수집 ---
  try {
    const listHtml = await politeFetch(LIST_URL);
    if (listHtml.length > 10_000) {
      // WAF challenge 페이지는 ~2KB. 10KB 넘으면 실제 콘텐츠로 간주.
      const $list = load(listHtml);
      const hrefs = $list("a[href]")
        .map((_, el) => $list(el).attr("href"))
        .get()
        .filter((h) => /\/opinion\/editorial\/\d{8}\/ed-/.test(h));
      if (hrefs.length) {
        const link = absUrl(LIST_URL, hrefs[0]);
        const articleHtml = await politeFetch(link);
        const $ = load(articleHtml);
        const og = $('meta[property="og:title"]').attr("content") || "";
        const desc =
          $('meta[property="og:description"]').attr("content") ||
          $('meta[name="description"]').attr("content") ||
          "";
        const title = og
          .replace(/\s*-\s*The Korea Times\s*$/i, "")
          .replace(/^\s*\[ED\]\s*/i, "")
          .trim();
        const body = desc.replace(/\s+/g, " ").trim();
        return {
          editorial: {
            title,
            kicker: "The Korea Times · Editorial",
            byline: "EDITORIAL",
            body,
            pullQuote: firstSentence(body) || title,
            date: kstDate(),
            sourceUrl: link,
            gated: false, // 직접 수집 성공 시 원문 정책상 재게시 가능
          },
        };
      }
    }
  } catch {
    // 조용히 폴백
  }

  // --- 2차: Google News RSS ---
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
    .filter((it) => /\[ED\]/i.test(it.title));

  const fresh = sortRecent(items, 14);
  const pick = fresh[0];
  if (!pick) throw new Error("koreatimes: no recent [ED] editorial via direct scrape or GN RSS");

  const title = pick.title
    .replace(/\s*-\s*The Korea Times\s*$/i, "")
    .replace(/^\s*\[ED\]\s*/i, "")
    .trim();
  const $d = load(`<div>${pick.desc}</div>`);
  const snippet = $d("div").text().trim().replace(/\s+/g, " ");
  const date = pick.pub ? new Date(pick.pub).toISOString().slice(0, 10) : kstDate();

  return {
    editorial: {
      title,
      kicker: "The Korea Times · Editorial",
      byline: "EDITORIAL",
      body: snippet,
      pullQuote: firstSentence(snippet) || title,
      date,
      sourceUrl: pick.link,
      gated: true,
    },
  };
}
