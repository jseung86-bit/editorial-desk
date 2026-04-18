// 크롤러 실행 직후 Telegram 봇으로 아침 브리핑 발송.
// 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (GitHub Actions Secret)
//          SITE_URL 선택(기본값 Pages URL)
// 실패해도 워크플로우 전체를 터뜨리지 않도록 항상 exit 0.

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

  // 사이트 표시 순서와 동일하게 정렬 (main 4 + sub 4).
  const MAIN_IDS = ["koreatimes", "hankook", "chosun", "joongang"];
  const SUB_IDS = ["heraldcorp", "hani", "mk", "hankyung"];
  const byId = Object.fromEntries(outlets.map((o) => [o.id, o]));

  // HTML parse mode — Telegram만의 MarkdownV2는 -, ., (, ), ! 등 수많은 문자를
  // 죄다 백슬래시 이스케이프 해야 해서 기사 제목에서 매번 깨진다. HTML은 <, >, & 만
  // 처리하면 되어 훨씬 안정적.
  const fmt = (o) => {
    if (!o) return null;
    const title = escHtml(o.editorial?.title || "(no title)");
    const name = escHtml(o.name);
    const href = o.editorial?.sourceUrl || o.editorialUrl;
    // URL 자체에는 HTML-special 문자가 거의 안 들어가지만 혹시 모를 &는 엔티티로.
    const hrefSafe = href.replace(/&/g, "&amp;");
    return `<b>${name}</b>\n<a href="${hrefSafe}">${title}</a>`;
  };

  const lines = [];
  lines.push(`📰 <b>Editorial Desk</b> · ${kstDate()}`);
  lines.push("");
  lines.push("━━━━━━ MAIN ━━━━━━");
  for (const id of MAIN_IDS) {
    const s = fmt(byId[id]);
    if (s) { lines.push(s); lines.push(""); }
  }
  lines.push("━━━━ ALSO TODAY ━━━━");
  for (const id of SUB_IDS) {
    const s = fmt(byId[id]);
    if (s) { lines.push(s); lines.push(""); }
  }
  lines.push(`🔗 <a href="${SITE_URL.replace(/&/g, "&amp;")}">대시보드 전체 보기</a>`);

  const text = lines.join("\n");

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

/** Escape the 3 HTML entities Telegram's HTML parse mode cares about. */
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
