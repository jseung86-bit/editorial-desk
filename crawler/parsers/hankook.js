// 한국일보 — 공개. 사이트 리스팅 (`/news/opinion/editorial`)에서 [사설] 프리픽스 기사를
// 우선 수집하고 본문 og:description을 사용. 리스팅에 [사설]이 없으면 Google News RSS로
// 최신 [사설] 제목만이라도 확보 (본문 없음, 카드는 title-only로 렌더).
//
// 이전엔 GN을 primary로 썼지만 본문 없이는 요약 생성이 불가했다. 리스팅이 토·일요일에도
// 대개 최근 [사설]을 포함하므로 본문-있는 리스팅이 UX상 우선.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";
import { sortRecent } from "../lib/recency.js";

const GN_RSS =
  "https://news.google.com/rss/search?q=site:hankookilbo.com+%22%5B%EC%82%AC%EC%84%A4%5D%22&hl=ko&gl=KR";

export default async function parse({ outletMeta }) {
  // --- 1차: 사이트 리스팅 ---
  try {
    const listHtml = await politeFetch(outletMeta.editorialUrl);
    const $list = load(listHtml);
    const entries = [];
    $list("a[href*='/news/article/A']").each((_, el) => {
      const $a = $list(el);
      const href = $a.attr("href");
      const label = ($a.attr("aria-label") || $a.text() || "").trim();
      // 기사 ID의 첫 8자리가 YYYYMMDD — 이걸로 최신순 정렬.
      const idMatch = href?.match(/\/A(\d{8})\d+/);
      const dateKey = idMatch ? idMatch[1] : "";
      entries.push({ href, label, dateKey });
    });
    const saseolEntries = entries
      .filter((e) => /^\[사설\]/.test(e.label))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    if (saseolEntries.length > 0) {
      // 24h 윈도우: 오늘 또는 어제 KST 날짜의 dateKey만. URL 내 dateKey는 YYYYMMDD.
      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 3600 * 1000);
      const ymd = kst.toISOString().slice(0, 10).replace(/-/g, "");
      const yest = new Date(kst.getTime() - 24 * 3600 * 1000)
        .toISOString().slice(0, 10).replace(/-/g, "");
      const todayPicks = saseolEntries.filter((e) => e.dateKey === ymd || e.dateKey === yest);
      const picks = (todayPicks.length ? todayPicks : saseolEntries.slice(0, 1)).slice(0, 3);

      const editorials = await Promise.all(picks.map(async (entry) => {
        const link = absUrl(outletMeta.editorialUrl, entry.href);
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
          summary = pipeParts[1]
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 10)
            .slice(0, 3);
        }
        return {
          title: cleanTitle,
          kicker: "한국일보 · 사설",
          byline: "사설",
          body: desc,
          summary,
          pullQuote: summary[0] || firstSentence(desc),
          date: (og.publishedAt || "").slice(0, 10) || kstDate(),
          sourceUrl: link,
          gated: false,
        };
      }));
      return { editorials };
    }
  } catch {
    // 사이트 장애 시 GN으로 폴백
  }

  // --- 2차: Google News RSS (title-only 폴백) ---
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
  if (fresh.length === 0) throw new Error("hankook: no [사설] via listing or Google News");

  // GN 폴백: 24h 내 다수 [사설] 가능, title-only.
  const within24h = fresh.filter((it) => Date.now() - new Date(it.pub).getTime() < 24 * 3600 * 1000);
  const picks = (within24h.length ? within24h : fresh.slice(0, 1)).slice(0, 3);
  return {
    editorials: picks.map((pick) => ({
      title: pick.title.replace(/\s*-\s*한국일보\s*$/, "").replace(/^\[사설\]\s*/, ""),
      kicker: "한국일보 · 사설",
      byline: "사설",
      body: "",
      pullQuote: pick.title,
      date: pick.pub ? new Date(pick.pub).toISOString().slice(0, 10) : kstDate(),
      sourceUrl: pick.link,
      gated: false,
    })),
  };
}
