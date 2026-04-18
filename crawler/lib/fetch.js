// Thin fetch wrapper — UA, timeout, retry. Node 20 has global fetch via undici.
import { setTimeout as wait } from "node:timers/promises";

const UA =
  "Mozilla/5.0 (compatible; EditorialDeskBot/0.1; +https://github.com/<you>/editorial-desk) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function fetchHtml(url, { timeoutMs = 15_000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": UA,
          "accept": "text/html,application/xhtml+xml",
          "accept-language": "ko,en;q=0.8",
        },
        signal: ctrl.signal,
        redirect: "follow",
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
      return await res.text();
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (attempt < retries) await wait(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

// Simple per-host throttle (1 req / sec)
const lastHit = new Map();
export async function politeFetch(url, opts) {
  const host = new URL(url).host;
  const last = lastHit.get(host) ?? 0;
  const gap = Date.now() - last;
  if (gap < 1000) await wait(1000 - gap);
  lastHit.set(host, Date.now());
  const html = await fetchHtml(url, opts);
  if (process.env.CRAWL_DEBUG) {
    console.log(`  [debug] GET ${url} → ${html.length} bytes`);
  }
  return html;
}

/** Debug helper: print the first N candidate links matching a selector. */
export function debugLinks($, selector, n = 8) {
  if (!process.env.CRAWL_DEBUG) return;
  const hits = $(selector).slice(0, n);
  console.log(`  [debug] "${selector}" → ${$(selector).length} matches, top ${hits.length}:`);
  hits.each((i, el) => {
    const href = $(el).attr("href");
    const txt = $(el).text().trim().slice(0, 60);
    console.log(`    ${i + 1}. ${href}  "${txt}"`);
  });
}
