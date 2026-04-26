// 크롤러 실행 직후 Telegram 봇으로 아침 브리핑 발송.
// 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (GitHub Actions Secret)
//          SITE_URL 선택(기본값 Pages URL)
// 실패해도 워크플로우 전체를 터뜨리지 않도록 항상 exit 0.
//
// 메시지 형식 (사용자 확정):
//   The Korea Times · 코리아타임즈
//   A $1 copper mine
//      진보 ●─○─○─○─○ 보수
//      • Bullet 1
//      • Bullet 2
//      • Bullet 3
//
//   같은 매체에 사설 2개면 (1/2), (2/2) 인디케이터.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kstDate } from "./lib/extract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "public", "data.js");
const SITE_URL = process.env.SITE_URL || "https://jseung86-bit.github.io/editorial-desk/";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.log("[notify] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping.");
  process.exit(0);
}

try {
  const src = await readFile(DATA_PATH, "utf8");
  const m = src.match(/window\.OUTLETS\s*=\s*(\[[\s\S]*?\])\s*;\s*\n\s*window\.CRAWL_META/);
  if (!m) throw new Error("could not parse OUTLETS from data.js");
  const outlets = JSON.parse(m[1]);

  // 사이트 표시 순서와 동일.
  const ORDER = ["koreatimes", "hankook", "chosun", "joongang",
                 "heraldcorp", "hani", "mk", "hankyung"];
  const byId = Object.fromEntries(outlets.map((o) => [o.id, o]));

  // 평탄화: 매체별 editorials[] 또는 단일 editorial을 카드 단위로.
  const cards = [];
  for (const id of ORDER) {
    const o = byId[id];
    if (!o) continue;
    const eds = o.editorials?.length ? o.editorials : (o.editorial ? [o.editorial] : []);
    eds.forEach((ed, i) => cards.push({ outlet: o, ed, idx: i, total: eds.length }));
  }

  const lines = [];
  lines.push(`📰 <b>Editorial Desk</b> · ${kstDate()}`);
  lines.push(`<i>${cards.length} editorials from ${outlets.length} outlets</i>`);
  lines.push("");

  for (const card of cards) {
    lines.push(formatCard(card));
    lines.push("");
  }

  lines.push(`🔗 <a href="${escUrl(SITE_URL)}">대시보드 전체 보기</a>`);

  let text = lines.join("\n");

  // Telegram 4096 char 제한 — 안전하게 4000자로 자르고, 자르면 표시.
  if (text.length > 4000) {
    text = text.slice(0, 3960) + "\n\n…(잘림 · 대시보드에서 전체 확인)";
  }

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const j = await res.json();
  if (!res.ok || !j.ok) {
    console.warn(`[notify] Telegram HTTP ${res.status}: ${JSON.stringify(j).slice(0, 300)}`);
    process.exit(0);
  }
  console.log(`[notify] sent ${text.length} chars to chat ${CHAT_ID}`);
} catch (err) {
  console.warn(`[notify] failed: ${err.message}`);
  process.exit(0);
}

/** Format one editorial card into the agreed multi-line block. */
function formatCard({ outlet, ed, idx, total }) {
  if (!ed) return "";
  const isKo = outlet.lang === "ko";
  // 매체명: 영문 · 한글 두 개가 다를 때만 둘 다 표시 (영문 매체는 둘이 같음).
  const nameParts = [];
  if (outlet.nameEn && outlet.nameEn !== outlet.name) {
    nameParts.push(outlet.nameEn);
    nameParts.push(outlet.name);
  } else {
    nameParts.push(outlet.name);
  }
  const indicator = total > 1 ? ` (${idx + 1}/${total})` : "";
  const header = `<b>${escHtml(nameParts.join(" · "))}${escHtml(indicator)}</b>`;

  const title = `<a href="${escUrl(ed.sourceUrl || outlet.editorialUrl)}">${escHtml(ed.title || "(no title)")}</a>`;

  // Lean bar — fall back to neutral display when leanScore missing.
  const bar = leanBar(ed.leanScore);

  // Bullet summary — prefer the original-language summary (이미 한국어이거나 영어).
  // 없으면 pullQuote 한 줄. 둘 다 없으면 생략.
  const bullets = [];
  if (Array.isArray(ed.summary) && ed.summary.length) {
    for (const s of ed.summary.slice(0, 3)) {
      const t = String(s).trim();
      if (t) bullets.push(`   • ${escHtml(t)}`);
    }
  } else if (ed.pullQuote) {
    bullets.push(`   • ${escHtml(ed.pullQuote)}`);
  }

  const blockLines = [header, title, `   ${bar}`, ...bullets];
  return blockLines.join("\n");
}

/** 진보 ○●○○○ 보수 — score 1..5의 위치에 채운 점 (간격 없이 5문자로 압축).
 *  leanScore가 null이면 빈 동그라미만 (정보 누락 명시). */
function leanBar(ls) {
  const valid = ls && Number.isFinite(ls.score);
  const score = valid ? Math.max(1, Math.min(5, Math.round(ls.score))) : 0;
  const dots = [1, 2, 3, 4, 5].map((i) => (i === score ? "●" : "○")).join("");
  return `진보 ${dots} 보수`;
}

/** Escape the 3 HTML entities Telegram's HTML parse mode cares about. */
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** URLs need only & escaped for HTML mode; Telegram handles ?, =, etc. fine. */
function escUrl(s) {
  return String(s).replace(/&/g, "&amp;");
}
