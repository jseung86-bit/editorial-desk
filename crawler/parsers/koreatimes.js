// Korea Times — AWS WAF가 GitHub Actions IP를 차단해 사이트 직접 수집 불가.
// Google News RSS는 relevance 정렬이라 기본 첫 item이 몇 달 전 기사일 수 있음 →
// [ED] 프리픽스 필터 + pubDate DESC 정렬 + 최근 14일 이내만.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { firstSentence, kstDate } from "../lib/extract.js";
import { sortRecent } from "../lib/recency.js";

const GN_RSS =
  "https://news.google.com/rss/search?q=site:koreatimes.co.kr/opinion/editorial&hl=en-US&gl=US";

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
    .filter((it) => /\[ED\]/i.test(it.title));

  const fresh = sortRecent(items, 14);
  const pick = fresh[0];
  if (!pick) throw new Error("koreatimes: no recent [ED] editorial in Google News RSS");

  const rawTitle = pick.title;
  const title = rawTitle.replace(/\s*-\s*The Korea Times\s*$/, "").replace(/^\[ED\]\s*/, "");
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
