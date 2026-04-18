// 한국일보 — 공개이지만 사이트 리스트가 Next.js 기반이라 SSR HTML에 최근 5개만 노출되고
// 그마저도 [사설] + [칼럼] 혼재 + 시점에 따라 빠져있음. 최신성 보장을 위해 Google News RSS
// [사설] 프리픽스 + pubDate DESC + 최근 7일로 후보를 먼저 고른다. 사이트 리스트는 폴백.
// 기사 본문은 og:description 또는 meta description에서 추출.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";
import { sortRecent } from "../lib/recency.js";

const GN_RSS =
  "https://news.google.com/rss/search?q=site:hankookilbo.com+%22%5B%EC%82%AC%EC%84%A4%5D%22&hl=ko&gl=KR";

export default async function parse({ outletMeta }) {
  // --- 1차: Google News RSS (최신성) ---
  try {
    const xml = await politeFetch(GN_RSS);
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
      .filter((it) => /^\[사설\]/.test(it.title));
    const fresh = sortRecent(items, 7);
    if (fresh.length > 0) {
      const pick = fresh[0];
      const title = pick.title.replace(/\s*-\s*한국일보\s*$/, "").replace(/^\[사설\]\s*/, "");
      const date = pick.pub ? new Date(pick.pub).toISOString().slice(0, 10) : kstDate();
      // Google News redirect 링크는 브라우저에서 실제 기사로 자연 리다이렉트된다.
      // 본문은 별도 fetch 불가 — 제목 + perspective만 제공, gated 카드로 렌더.
      return {
        editorial: {
          title,
          kicker: "한국일보 · 사설",
          byline: "사설",
          body: "",
          pullQuote: title,
          date,
          sourceUrl: pick.link,
          gated: false,
          _note: "title-only from Google News",
        },
      };
    }
  } catch {
    // fall through
  }

  // --- 2차: 사이트 리스트 폴백 ---
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  const entries = [];
  $list("a[href*='/news/article/A']").each((_, el) => {
    const $a = $list(el);
    const href = $a.attr("href");
    const label = $a.attr("aria-label") || $a.text() || "";
    entries.push({ href, label: label.trim() });
  });
  const saseolEntry = entries.find((e) => /^\[사설\]/.test(e.label));
  const href = saseolEntry?.href || entries[0]?.href;
  const link = absUrl(outletMeta.editorialUrl, href);
  if (!link) throw new Error("hankook: no editorial link found (GN RSS + site both failed)");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const rawTitle = og.title || $("h1").first().text().trim();
  const cleanTitle = rawTitle
    .replace(/\s*[-—–]\s*오피니언\s*[ㅣ|·]\s*한국일보\s*$/i, "")
    .replace(/\s*[ㅣ|]\s*한국일보\s*$/i, "")
    .trim();
  const desc = og.description || $('meta[name="description"]').attr("content") || "";

  let summary = [];
  const pipeParts = desc.split("|");
  if (pipeParts.length >= 2) {
    summary = pipeParts[1].split(",").map((s) => s.trim()).filter((s) => s.length > 10).slice(0, 3);
  }

  return {
    editorial: {
      title: cleanTitle,
      kicker: "한국일보 · 사설",
      byline: "사설",
      body: desc,
      summary,
      pullQuote: summary[0] || firstSentence(desc),
      date: (og.publishedAt || "").slice(0, 10) || kstDate(),
      sourceUrl: link,
      gated: false,
    },
  };
}
