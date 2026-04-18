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
