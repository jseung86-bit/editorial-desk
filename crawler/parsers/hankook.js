// Hankook Ilbo — 공개. 기사 HTML도 클라이언트 렌더라 본문 태그가 비어있음.
// 다행히 og:description에 "(칼럼타입) 요약. | 문장1, 문장2, 문장3." 구조로 3줄 요약이 들어있다.
// body = 전체 description, summary = `|` 뒤 부분을 `,`로 split.
import { load } from "cheerio";
import { politeFetch } from "../lib/fetch.js";
import { ogMeta, firstSentence, absUrl, kstDate } from "../lib/extract.js";

export default async function parse({ outletMeta }) {
  const listHtml = await politeFetch(outletMeta.editorialUrl);
  const $list = load(listHtml);
  // 리스트 페이지는 [사설]·[칼럼]·네임드 오피니언이 혼재한다. aria-label이 "[사설]" 로
  // 시작하는 링크만 필터해야 실제 편집국 사설을 고른다. aria-label이 없을 땐
  // innerText로 폴백.
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
  if (!link) throw new Error("hankook: no editorial link found");

  const html = await politeFetch(link);
  const $ = load(html);
  const og = ogMeta($);
  const desc = og.description || "";

  // og:description 구조: "(칼럼타입) 개요. | 문장1,문장2,문장3."
  // `|` 뒤의 3-line summary를 우선 추출. 실패하면 전체를 body로만.
  let summary = [];
  const pipeParts = desc.split("|");
  if (pipeParts.length >= 2) {
    summary = pipeParts[1]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 3);
  }

  // 한국일보 og:title은 "기사제목-오피니언ㅣ한국일보" 형태 — 사이트/섹션 suffix 제거.
  const rawTitle = og.title || $("h1").first().text().trim();
  const cleanTitle = rawTitle
    .replace(/\s*[-—–]\s*오피니언\s*[ㅣ|·]\s*한국일보\s*$/i, "")
    .replace(/\s*[ㅣ|]\s*한국일보\s*$/i, "")
    .trim();

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
