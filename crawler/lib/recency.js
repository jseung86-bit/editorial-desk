// Google News RSS often returns results by RELEVANCE, not by date — so the
// first <item> can be months or years old. These helpers force date-sorted,
// recency-filtered selection so crawler output always reflects TODAY.

/** Parse common RSS pubDate formats. Returns 0 on failure. */
export function parsePubDate(s) {
  if (!s) return 0;
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

/**
 * Sort items by pubDate DESC and keep only those within `maxAgeDays`.
 * Returns the filtered array; caller picks [0] for freshest.
 *
 * @param {Array<{pub: string|number}>} items
 * @param {number} maxAgeDays  — how far back to accept
 */
export function sortRecent(items, maxAgeDays = 14) {
  const cutoff = Date.now() - maxAgeDays * 24 * 3600 * 1000;
  return items
    .map((it) => ({ ...it, _ms: typeof it.pub === "number" ? it.pub : parsePubDate(it.pub) }))
    .filter((it) => it._ms >= cutoff)
    .sort((a, b) => b._ms - a._ms);
}

/**
 * Pick all items published within the last 24 hours (rolling window).
 * Used for multi-editorial collection — most outlets publish 1, occasionally 2.
 * Capped at `cap` items as defense against bad date parsing flooding the feed.
 *
 * @param {Array<{pub: string|number}>} items
 * @param {number} cap — hard upper bound on returned count (default 3)
 */
export function pickLast24h(items, cap = 3) {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  return items
    .map((it) => ({ ...it, _ms: typeof it.pub === "number" ? it.pub : parsePubDate(it.pub) }))
    .filter((it) => it._ms >= cutoff)
    .sort((a, b) => b._ms - a._ms)
    .slice(0, cap);
}

/**
 * Today-in-KST filter for list pages without per-item dates. Pulls the YYYYMMDD
 * date out of a URL pattern (most KR outlets embed it: /20260426/ed-foo).
 * Returns items whose URL date matches today (KST).
 *
 * @param {Array<{link: string}>} items
 * @param {RegExp} dateRegex — must capture YYYYMMDD as group 1
 * @param {number} cap
 */
export function pickTodayByUrl(items, dateRegex, cap = 3) {
  // KST = UTC+9. Today's date string YYYYMMDD in KST.
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const ymd = kst.toISOString().slice(0, 10).replace(/-/g, "");
  const yesterday = new Date(kst.getTime() - 24 * 3600 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
  const valid = new Set([ymd, yesterday]); // include yesterday-KST so 06:00 KST run still finds early-AM posts.
  return items
    .filter((it) => {
      const m = (it.link || "").match(dateRegex);
      return m && valid.has(m[1]);
    })
    .slice(0, cap);
}
