// 크롤러 실행 직후 Telegram 봇으로 아침 브리핑 발송.
// 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (GitHub Actions Secret)
//          SITE_URL 선택(기본값 Pages URL)
// 실패해도 워크플로우 전체를 터뜨리지 않도록 항상 exit 0.
//
// 메시지 형식 (사용자 확정):
//   The Korea Times · 코리아타임즈
//   A $1 copper mine
//      진보 ○●○○○ 보수
//      • Bullet 1
//      • Bullet 2
//      • Bullet 3
//
//   같은 매체에 사설 2개면 (1/2), (2/2) 인디케이터.
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

  const ORDER = ["koreatimes", "hankook", "chosun", "joongang",
                 "heraldcorp", "hani", "mk", "hankyung"];
  const byId = Object.fromEntries(outlets.map((o) => [o.id, o]));

  // 평탄화 + dedup: 같은 sourceUrl이 두 번 들어가면(파서 버그 방어) 하나만.
  const seenUrls = new Set();
  const cards = [];
  for (const id of ORDER) {
    const o = byId[id];
    if (!o) continue;
    const eds = o.editorials?.length ? o.editorials : (o.editorial ? [o.editorial] : []);
    const uniqEds = [];
    for (const ed of eds) {
      const key = ed?.sourceUrl || `${id}-${ed?.title}`;
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      uniqEds.push(ed);
    }
    uniqEds.forEach((ed, i) =>
      cards.push({ outlet: o, ed, idx: i, total: uniqEds.length }),
    );
  }

  // 헤더/푸터.
  const header = [
    `📰 <b>Editorial Desk</b> · ${kstDate()}`,
    `<i>${cards.length} editorials from ${outlets.length} outlets</i>`,
    "",
  ];
  const footer = `🔗 <a href="${escUrl(SITE_URL)}">대시보드 전체 보기</a>`;

  // 카드들을 SAFE_LIMIT 안에서 chunk로 나눔. 카드 단위로만 분할 — 카드 중간에서 자르지 않음.
  const cardBlocks = cards.map((c) => formatCard(c));
  const chunks = packChunks(header.join("\n"), cardBlocks, footer, SAFE_LIMIT);

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

/** Format one editorial card into the agreed multi-line block. */
function formatCard({ outlet, ed, idx, total }) {
  if (!ed) return "";
  const nameParts = [];
  if (outlet.nameEn && outlet.nameEn !== outlet.name) {
    nameParts.push(outlet.nameEn);
    nameParts.push(outlet.name);
  } else {
    nameParts.push(outlet.name);
  }
  const indicator = total > 1 ? ` (${idx + 1}/${total})` : "";
  const headerLine = `<b>${escHtml(nameParts.join(" · "))}${escHtml(indicator)}</b>`;

  const url = ed.sourceUrl || outlet.editorialUrl || "";
  // URL이 비정상이면 a 태그를 만들지 않고 그냥 제목만 — 깨진 a 태그가 메시지 전체를 망가뜨리는 걸 방지.
  const titleEsc = escHtml(ed.title || "(no title)");
  const titleLine = isLikelyValidUrl(url)
    ? `<a href="${escUrl(url)}">${titleEsc}</a>`
    : titleEsc;

  const bar = leanBar(ed.leanScore);

  const bullets = [];
  if (Array.isArray(ed.summary) && ed.summary.length) {
    for (const s of ed.summary.slice(0, 3)) {
      const t = String(s).trim();
      if (t) bullets.push(`   • ${escHtml(t)}`);
    }
  } else if (ed.pullQuote) {
    bullets.push(`   • ${escHtml(ed.pullQuote)}`);
  }

  return [headerLine, titleLine, `   ${bar}`, ...bullets].join("\n");
}

/** 진보 ○●○○○ 보수 — score 1..5의 위치에 채운 점 (간격 없이 5문자). */
function leanBar(ls) {
  const valid = ls && Number.isFinite(ls.score);
  const score = valid ? Math.max(1, Math.min(5, Math.round(ls.score))) : 0;
  const dots = [1, 2, 3, 4, 5].map((i) => (i === score ? "●" : "○")).join("");
  return `진보 ${dots} 보수`;
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
