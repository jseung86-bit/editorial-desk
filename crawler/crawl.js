// Entry point — runs all parsers in parallel, enriches with LLM, writes public/data.js.
//
// Usage:
//   node crawl.js                       # full run
//   node crawl.js --dry-run             # print result, don't write
//   node crawl.js --only chosun         # run one parser only
//   node crawl.js --only chosun --debug # dump raw HTML + candidate links
//
// Failure policy:
//   - Per-outlet errors are caught; that outlet falls back to previous snapshot.
//   - We refuse to overwrite data.js unless >=5 outlets succeeded.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OUTLETS } from "./outlets.config.js";
import { enrich, translate, translateTitle, translateLines, perspective } from "./lib/llm.js";
import { kstDate } from "./lib/extract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "public", "data.js");
const ARCHIVE_DIR = join(__dirname, "archive");

// ---- CLI args ----------------------------------------------------------------
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const DEBUG = args.includes("--debug");
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const MIN_SUCCESS = 5;

if (DEBUG) process.env.CRAWL_DEBUG = "1";

// ---- Main --------------------------------------------------------------------
const targets = ONLY ? OUTLETS.filter((o) => o.id === ONLY) : OUTLETS;
if (ONLY && targets.length === 0) {
  console.error(`No outlet with id="${ONLY}"`);
  process.exit(2);
}

console.log(`[crawl] ${kstDate()} · targets=${targets.map((t) => t.id).join(",")}`);

const prev = await loadPrev();

const results = await Promise.all(
  targets.map(async (meta) => {
    try {
      const mod = await import(`./parsers/${meta.id}.js`);
      const t0 = Date.now();
      const partial = await mod.default({ outletMeta: meta });
      const ed = partial.editorial;
      if (!ed?.title) throw new Error("parser returned no title");

      // LLM enrich — only for non-gated outlets with real body text.
      let extra = { summary: [], tags: [], pullQuote: ed.pullQuote, stance: "" };
      if (!ed.gated && ed.body && ed.body.length > 200) {
        extra = await enrich({ title: ed.title, body: ed.body, lang: meta.lang });
      }
      const summary = extra.summary.length ? extra.summary : ed.summary ?? [];

      // Pre-compute translations + perspective tag at crawl time. The frontend
      // has no Anthropic access at runtime (window.claude is Artifacts-only),
      // so every AI artifact must be baked into data.js here.
      // Body translation only for outlets with substantial body text — skips
      // gated stubs and chosun (no SSR body).
      const shouldTranslateBody = ed.body && ed.body.length > 100;
      const [titleTr, summaryTr, bodyTr, perspectiveTag] = await Promise.all([
        translateTitle(ed.title, meta.lang),
        translateLines(summary, meta.lang),
        shouldTranslateBody ? translate(ed.body, meta.lang) : Promise.resolve(""),
        perspective({ title: ed.title, summary, lang: meta.lang }),
      ]);

      const merged = {
        ...meta,
        editorial: {
          ...ed,
          summary,
          tags: extra.tags.length ? extra.tags : ed.tags ?? [],
          pullQuote: extra.pullQuote || ed.pullQuote,
          stance: extra.stance || ed.stance || "",
          topic: ed.topic ?? null,
          titleTr,
          summaryTr,
          bodyTr,
          perspective: perspectiveTag,
        },
        top3: partial.top3 ?? prev?.[meta.id]?.top3 ?? [],
      };
      console.log(`  ✓ ${meta.id.padEnd(12)} ${Date.now() - t0}ms  "${ed.title.slice(0, 60)}"`);
      return { ok: true, outlet: merged };
    } catch (err) {
      console.warn(`  ✗ ${meta.id.padEnd(12)} ${err.message}`);
      const fallback = prev?.[meta.id];
      if (fallback) {
        return { ok: false, outlet: { ...fallback, _stale: true }, error: err.message };
      }
      return { ok: false, error: err.message, id: meta.id };
    }
  }),
);

const successes = results.filter((r) => r.ok).length;
const outlets = results.filter((r) => r.outlet).map((r) => r.outlet);

console.log(`[crawl] ${successes}/${targets.length} fresh; ${outlets.length} total in output`);

if (!DRY && successes < MIN_SUCCESS && !ONLY) {
  console.error(`[crawl] aborting write — only ${successes} fresh successes (min ${MIN_SUCCESS})`);
  process.exit(1);
}

// Front-end expects these globals alongside OUTLETS. MARKET_STRIP/CROSS_COMPARE
// are decorative on Option A — populate as empty lists until we wire real sources.
const crawlMeta = {
  lastSync: `${kstDate()} 06:00 KST`,
  schedule: "매일 06:00 KST / Daily 6:00 AM KST",
  outletCount: outlets.length,
  status: successes >= MIN_SUCCESS ? "synced" : "partial",
};

const out = `// AUTO-GENERATED by crawler/crawl.js — do not edit by hand.
// Last run: ${new Date().toISOString()}
window.OUTLETS = ${JSON.stringify(outlets, null, 2)};
window.CRAWL_META = ${JSON.stringify(crawlMeta, null, 2)};
window.MARKET_STRIP = [];
window.CROSS_COMPARE = [];
window.LAST_CRAWL = ${JSON.stringify({
  at: new Date().toISOString(),
  successes,
  total: targets.length,
})};
`;

if (DRY) {
  console.log("\n---- DRY RUN — data.js preview ----\n");
  console.log(out.slice(0, 1200) + "\n…");
  process.exit(0);
}

await writeFile(DATA_PATH, out);
console.log(`[crawl] wrote ${DATA_PATH} (${out.length} bytes)`);

// archive
await mkdir(ARCHIVE_DIR, { recursive: true });
const archivePath = join(ARCHIVE_DIR, `${kstDate()}.json`);
await writeFile(archivePath, JSON.stringify(outlets, null, 2));
console.log(`[crawl] archived ${archivePath}`);

// ---- helpers -----------------------------------------------------------------
async function loadPrev() {
  if (!existsSync(DATA_PATH)) return null;
  try {
    const src = await readFile(DATA_PATH, "utf8");
    // Greedy match up to the start of window.LAST_CRAWL — non-greedy (`[\s\S]*?\]`)
    // stops at the FIRST `]` it sees (e.g. a nested top3 array), which breaks parsing.
    // Non-greedy with CRAWL_META anchor. Non-greedy without anchor stops at the
    // FIRST `]` (e.g. inside a nested top3 array); greedy with a late anchor
    // (LAST_CRAWL) swallows the MARKET_STRIP/CROSS_COMPARE arrays that follow.
    const m = src.match(
      /window\.OUTLETS\s*=\s*(\[[\s\S]*?\])\s*;\s*\n\s*window\.(?:CRAWL_META|LAST_CRAWL)/,
    );
    if (!m) return null;
    const arr = JSON.parse(m[1]);
    return Object.fromEntries(arr.map((o) => [o.id, o]));
  } catch (err) {
    console.warn(`[crawl] could not read previous data.js: ${err.message}`);
    return null;
  }
}
