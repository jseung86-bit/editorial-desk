// 크롤러 실행 직후 Telegram 봇으로 아침 브리핑 발송.
// 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (GitHub Actions Secret)
//          SITE_URL 선택(기본값 Pages URL)
// 실패해도 워크플로우 전체를 터뜨리지 않도록 항상 exit 0.
//
// 메시지 형식 (2026-09-11 사용자 확정):
//   📰 Editorial Desk · 2026-09-11 (금)
//   17 editorials · 8 outlets
//
//   ─────────────────
//   ◆ The Korea Times
//   Title (link)                 ← SUMMARY_OUTLETS 매체는 제목 아래 3줄 요약
//    • Bullet 1
//    • Bullet 2
//    • Bullet 3
//
//   ─────────────────
//   ◆ 조선일보
//   1. 사설 제목 (link)           ← 그 외 매체는 제목+링크만, 2건 이상이면 번호
//   2. 사설 제목 (link)
//
//   제목 앞 "[사설]" 프리픽스는 중복 정보라 제거.
//
// 메시지 길이가 SAFE_LIMIT을 넘으면 카드 경계에서 2개 이상으로 분할 발송.
// HTML 파싱 실패하면 plain text 모드로 자동 폴백 — 메시지 누락 방지.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kstDate } from "./lib/extract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "public", "data.js");
const SITE_URL = process.env.SITE_URL || "https://jseung86-bit.github.io/editorial-desk/";

// Telegram hard limit 4096 chars. Leave headroom for header/footer + truncation safety.
const SAFE_LIMIT = 3500;
// 3줄 요약까지 싣는 매체. 나머지는 제목+링크만.
const SUMMARY_OUTLETS = new Set(["koreatimes", "hankook"]);
const MAX_SUMMARY_LINES = 3;
const SEPARATOR = "─────────────────";
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// `node notify.js --dry-run` prints the assembled message instead of sending it.
const DRY_RUN = process.argv.includes("--dry-run");

if (!DRY_RUN && (!TOKEN || !CHAT_ID)) {
  console.log("[notify] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping.");
  process.exit(0);
}

try {
  const src = await readFile(DATA_PATH, "utf8");
  const m = src.match(/window\.OUTLETS\s*=\s*(\[[\s\S]*?\])\s*;\s*\n\s*window\.CRAWL_META/);
  if (!m) throw new Error("could not parse OUTLETS from data.js");
  const outlets = JSON.parse(m[1]);

  const ORDER = ["koreatimes", "hankook", "chosun", "joongang",
                 "heraldcorp", "hani", "mk", "hankyung"];
  const byId = Object.fromEntries(outlets.map((o) => [o.id, o]));

  // 매체별로 사설을 묶음. dedup: 같은 sourceUrl이 두 번 들어가면(파서 버그 방어) 하나만.
  const seenUrls = new Set();
  const cards = [];
  let editorialCount = 0;
  for (const id of ORDER) {
    const o = byId[id];
    if (!o) continue;
    const eds = o.editorials?.length ? o.editorials : (o.editorial ? [o.editorial] : []);
    const uniqEds = [];
    for (const ed of eds) {
      if (!ed) continue;
      const key = ed.sourceUrl || `${id}-${ed.title}`;
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      uniqEds.push(ed);
    }
    if (!uniqEds.length) continue;
    editorialCount += uniqEds.length;
    cards.push({ outlet: o, eds: uniqEds });
  }

  // 헤더/푸터.
  const header = [
    `📰 <b>Editorial Desk</b> · ${kstDateWithWeekday()}`,
    `<i>${editorialCount} editorials · ${cards.length} outlets</i>`,
    "",
    "",
  ];
  const footer = `🔗 <a href="${escUrl(SITE_URL)}">대시보드 전체 보기</a>`;

  // 카드들을 SAFE_LIMIT 안에서 chunk로 나눔. 카드 단위로만 분할 — 카드 중간에서 자르지 않음.
  const cardBlocks = cards.map((c) => formatCard(c));
  const chunks = packChunks(header.join("\n"), cardBlocks, footer, SAFE_LIMIT);

  if (DRY_RUN) {
    chunks.forEach((c, i) => console.log(`--- chunk ${i + 1}/${chunks.length} (${c.body.length} chars)\n${c.body}`));
    process.exit(0);
  }

  // 발송 — HTML 우선, 실패하면 plain text로 폴백 후 한번 더 시도.
  for (let i = 0; i < chunks.length; i++) {
    const partLabel = chunks.length > 1
      ? `\n<i>(${i + 1}/${chunks.length})</i>`
      : "";
    const text = chunks[i].body + partLabel;
    const ok = await sendTelegram(text, "HTML");
    if (!ok) {
      const plain = stripHtml(text);
      const okPlain = await sendTelegram(plain, null);
      if (!okPlain) {
        console.warn(`[notify] both HTML and plain text failed for chunk ${i + 1}`);
      } else {
        console.log(`[notify] chunk ${i + 1}/${chunks.length}: HTML failed, plain text fallback OK (${plain.length} chars)`);
      }
    } else {
      console.log(`[notify] chunk ${i + 1}/${chunks.length}: sent ${text.length} chars`);
    }
    // Telegram rate limit는 30 msg/sec까지 ok지만 같은 채팅엔 1초 쿨다운 권장.
    if (i < chunks.length - 1) await sleep(900);
  }
} catch (err) {
  console.warn(`[notify] failed: ${err.message}`);
  process.exit(0);
}

/** Pack card blocks into chunks of <= maxLen chars each.
 *  - First chunk gets `header`, last chunk gets `footer`.
 *  - Cards are kept atomic — never split mid-card.
 *  - Returns [{ body: string }, ...] with body length already measured. */
function packChunks(header, cardBlocks, footer, maxLen) {
  const chunks = [];
  let buf = header;
  let isFirst = true;
  for (const block of cardBlocks) {
    const candidate = buf + (isFirst ? "" : "\n") + block + "\n";
    if (candidate.length <= maxLen) {
      buf = candidate;
      isFirst = false;
      continue;
    }
    // Flush current buf, start new chunk with this block.
    chunks.push({ body: buf.trimEnd() });
    buf = block + "\n";
    isFirst = false;
  }
  // Append footer to last chunk if it fits, else footer becomes its own chunk.
  if (buf.length + footer.length + 1 <= maxLen) {
    buf += "\n" + footer;
  } else {
    chunks.push({ body: buf.trimEnd() });
    buf = footer;
  }
  if (buf.trim()) chunks.push({ body: buf });
  return chunks;
}

async function sendTelegram(text, parseMode) {
  const body = {
    chat_id: CHAT_ID,
    text,
    disable_web_page_preview: true,
  };
  if (parseMode) body.parse_mode = parseMode;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) {
      console.warn(`[notify] Telegram HTTP ${res.status} (parseMode=${parseMode}): ${JSON.stringify(j).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[notify] fetch failed: ${err.message}`);
    return false;
  }
}

/** Format one outlet block: separator + outlet header, then one entry per editorial. */
function formatCard({ outlet, eds }) {
  const withSummary = SUMMARY_OUTLETS.has(outlet.id);
  const numbered = eds.length > 1;
  const entries = eds.map((ed, i) => formatEntry(ed, outlet, { withSummary, number: numbered ? i + 1 : null }));
  return [SEPARATOR, `<b>◆ ${escHtml(outlet.name)}</b>`, ...entries].join("\n");
}

/** One editorial: "[n.] linked title" plus optional bullet summary lines. */
function formatEntry(ed, outlet, { withSummary, number }) {
  const prefix = number ? `${number}. ` : "";
  const lines = [`${prefix}${formatTitle(ed, outlet)}`];
  if (withSummary) {
    for (const s of summaryLines(ed)) lines.push(` • ${escHtml(s)}`);
  }
  return lines.join("\n");
}

/** Up to MAX_SUMMARY_LINES bullets; falls back to the pull quote when no summary exists. */
function summaryLines(ed) {
  const raw = Array.isArray(ed.summary) ? ed.summary : [];
  const cleaned = raw.map((s) => String(s).trim()).filter((s) => s.length > 1);
  if (cleaned.length) return cleaned.slice(0, MAX_SUMMARY_LINES);
  return ed.pullQuote ? [String(ed.pullQuote).trim()] : [];
}

/** Title as a link when the URL is usable; plain title otherwise so a broken
 *  <a> tag can never corrupt the whole message. */
function formatTitle(ed, outlet) {
  const url = ed.sourceUrl || outlet.editorialUrl || "";
  const titleEsc = escHtml(cleanTitle(ed.title));
  return isLikelyValidUrl(url) ? `<a href="${escUrl(url)}">${titleEsc}</a>` : titleEsc;
}

/** Drop the redundant "[사설]" prefix and collapse whitespace. */
function cleanTitle(title) {
  return String(title || "(no title)")
    .replace(/^\s*\[사설\]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function kstDateWithWeekday() {
  const date = kstDate();
  // kstDate()는 이미 KST 기준 YYYY-MM-DD이므로 UTC 자정으로 파싱해 요일만 읽는다.
  const weekday = WEEKDAYS_KO[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${date} (${weekday})`;
}

/** HTML escape — Telegram HTML mode requires &, <, > escaped.
 *  Single/double quotes are also escaped to be safe inside attribute contexts
 *  even though Telegram is more lenient than browsers. */
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** URL escape for href attribute. Beyond &, also escape ", <, > since these
 *  are the chars that can prematurely close the href or the <a> tag. */
function escUrl(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Reject obviously broken URLs (no scheme, contains whitespace, etc.). */
function isLikelyValidUrl(s) {
  if (!s) return false;
  if (!/^https?:\/\//i.test(s)) return false;
  if (/\s/.test(s)) return false;
  return true;
}

/** Strip HTML tags + decode the entities we encoded for plain-text fallback. */
function stripHtml(s) {
  return String(s)
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<\/?(b|i|u|s|code|pre)\b[^>]*>/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
