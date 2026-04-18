// Optional LLM helper — generates 3-line summary, 4 tags, and a pull quote
// from editorial body text. Uses Anthropic API if ANTHROPIC_API_KEY is set;
// otherwise returns deterministic fallbacks derived from the text.

import { firstSentence } from "./extract.js";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

/**
 * @param {{ title: string, body: string, lang: "ko"|"en" }} input
 * @returns {Promise<{ summary: string[], tags: string[], pullQuote: string, stance: string }>}
 */
export async function enrich({ title, body, lang }) {
  if (!KEY || !body) return fallback({ title, body, lang });

  const prompt = buildPrompt({ title, body, lang });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = await res.json();
    const text = json.content?.[0]?.text ?? "";
    const parsed = JSON.parse(extractJson(text));
    return {
      summary: (parsed.summary ?? []).slice(0, 3),
      tags: (parsed.tags ?? []).slice(0, 4),
      pullQuote: parsed.pullQuote ?? firstSentence(body),
      stance: parsed.stance ?? "",
    };
  } catch (err) {
    console.warn(`[llm] enrich failed: ${err.message}. Using fallback.`);
    return fallback({ title, body, lang });
  }
}

function buildPrompt({ title, body, lang }) {
  const L = lang === "ko" ? "Korean" : "English";
  return `You are summarizing a newspaper editorial for a front-end dashboard.

Title: ${title}
Language: ${L}
Body:
"""
${body.slice(0, 4000)}
"""

Return STRICT JSON, no prose, with this shape:
{
  "summary": ["...", "...", "..."],    // exactly 3 short ${L} sentences
  "tags":    ["#a", "#b", "#c", "#d"], // 4 short hashtags in ${L === "Korean" ? "Korean with # prefix" : "English with # prefix, lowercase-hyphenated"}
  "pullQuote": "...",                  // one quotable ${L} sentence from the body, <= 120 chars
  "stance":    "..."                   // one-line editorial stance, in ${L}
}`;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : "{}";
}

function fallback({ title, body, lang }) {
  const sentences = (body || "")
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    summary: sentences.slice(0, 3),
    tags: [],
    pullQuote: firstSentence(body) ?? title ?? "",
    stance: "",
  };
}
