// Anthropic 기반 LLM 헬퍼. 모든 AI 작업은 크롤러(서버)에서 미리 수행해서
// data.js에 정적으로 박는다 — 프론트엔드는 window.claude 같은 런타임 API가 없다.
//
// 노출 함수:
//   enrich({ title, body, lang })       → { summary[], tags[], pullQuote, stance }
//   translate(text, sourceLang)         → 반대 언어로 번역
//   translateLines(lines[], sourceLang) → 배열 번역
//   perspective({ title, summary, lang })→ 2~4 단어 "오늘의 관점" 태그 (원문 언어)

import { firstSentence } from "./extract.js";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

async function callClaude(prompt, maxTokens = 600, { retries = 5 } = {}) {
  if (!KEY) throw new Error("no ANTHROPIC_API_KEY");
  // 50+ concurrent calls per run trip Anthropic's per-minute rate limit. With
  // narrow jitter (e.g. ±500ms) all callers retry within the same window and
  // re-trip the limit immediately — a thundering herd. Equal Jitter spreads
  // retries across [base/2, base): wide enough to diffuse the herd, narrow
  // enough to keep total wall-clock bounded under the GHA 10-min job timeout.
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.content?.[0]?.text ?? "";
    }
    lastErr = new Error(`LLM HTTP ${res.status}`);
    if (res.status !== 429 && res.status < 500) throw lastErr; // non-retryable
    if (attempt < retries) {
      const base = Math.min(32_000, 2000 * Math.pow(2, attempt)); // 2,4,8,16,32s cap
      const sleep = base / 2 + Math.random() * (base / 2);
      await new Promise((r) => setTimeout(r, sleep));
    }
  }
  throw lastErr;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : "{}";
}

/* ----------------------------- enrich (summary+) --------------------------- */
export async function enrich({ title, body, lang }) {
  if (!KEY || !body) return enrichFallback({ title, body });

  const L = lang === "ko" ? "Korean" : "English";
  // Summary 문장 하나는 한국어 기준 60자, 영어 기준 100자 이내로 강제.
  // 카드 UI에서 3줄이 시각적으로 꽉 차지 않고 균형 있게 보이도록.
  const maxChars = L === "Korean" ? 60 : 100;
  const prompt = `You are summarizing a newspaper editorial for a front-end dashboard.

Title: ${title}
Language: ${L}
Body:
"""
${body.slice(0, 4000)}
"""

Return STRICT JSON, no prose, with this shape:
{
  "summary": ["...", "...", "..."],    // exactly 3 short, punchy ${L} sentences. EACH sentence MUST be <= ${maxChars} characters. Compact, active voice, drop filler.
  "tags":    ["#a", "#b", "#c", "#d"], // 4 short hashtags in ${L === "Korean" ? "Korean with # prefix" : "English with # prefix, lowercase-hyphenated"}
  "pullQuote": "...",                  // one quotable ${L} sentence from the body, <= 120 chars
  "stance":    "..."                   // one-line editorial stance, in ${L}
}`;

  try {
    const text = await callClaude(prompt, 600);
    const parsed = JSON.parse(extractJson(text));
    return {
      summary: (parsed.summary ?? []).slice(0, 3),
      tags: (parsed.tags ?? []).slice(0, 4),
      pullQuote: parsed.pullQuote ?? firstSentence(body),
      stance: parsed.stance ?? "",
    };
  } catch (err) {
    console.warn(`[llm] enrich failed: ${err.message}. Using fallback.`);
    return enrichFallback({ title, body });
  }
}

function enrichFallback({ title, body }) {
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

/* ------------------------------- translate -------------------------------- */
/** 본문 번역 (prose). max_tokens를 글자 길이에 비례해 설정, 실패 시 원문 반환. */
export async function translate(text, sourceLang) {
  if (!KEY || !text) return text || "";
  const targetName = sourceLang === "ko" ? "English" : "Korean";
  const prompt = `Translate the following newspaper editorial body text into natural, journalistic ${targetName}. Preserve tone, meaning, and paragraph structure. Return ONLY the translation — no preamble, no quotes, no headings, no markdown.

---
${text}`;
  const maxTokens = Math.min(4000, Math.max(800, Math.floor(text.length * 0.6)));
  try {
    const out = await callClaude(prompt, maxTokens);
    return stripWrapper(out);
  } catch (err) {
    console.warn(`[llm] translate failed: ${err.message}`);
    return text;
  }
}

/** 제목 전용 — 한 줄, 마크다운/따옴표 제거, 짧게. "editorial text"라는 표현을
 *  보면 Claude가 기사 전체를 상상해 번역하는 문제를 막기 위해 별도 프롬프트로 분리. */
export async function translateTitle(title, sourceLang) {
  if (!KEY || !title) return title || "";
  const targetName = sourceLang === "ko" ? "English" : "Korean";
  const prompt = `Translate this newspaper headline into natural, journalistic ${targetName}.

STRICT REQUIREMENTS:
- Return ONLY the translated headline
- Single line, no newlines, no markdown, no "#" prefix
- No quotation marks around the output
- Match the length and punchiness of the original
- Do NOT invent or paraphrase body text — translate the headline itself

Headline: ${title}`;
  try {
    const out = await callClaude(prompt, 200);
    return stripWrapper(out).split("\n")[0].trim();
  } catch (err) {
    console.warn(`[llm] translateTitle failed: ${err.message}`);
    return title;
  }
}

function stripWrapper(s) {
  return (s || "")
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, "")
    .trim();
}

/** 배열 요소를 한 번의 호출로 번역. 프롬프트에 JSON으로 넣어 줄단위 매핑 보장. */
export async function translateLines(lines, sourceLang) {
  if (!KEY || !lines?.length) return lines || [];
  const targetName = sourceLang === "ko" ? "English" : "Korean";
  const prompt = `Translate each item in the JSON array below into natural, journalistic ${targetName}. Preserve tone, order, and count exactly. Return ONLY a JSON array of ${targetName} strings, no prose.

${JSON.stringify(lines)}`;
  try {
    const out = await callClaude(prompt, 1500);
    const match = out.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("no array in response");
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length !== lines.length) {
      throw new Error(`count mismatch: got ${arr.length}, expected ${lines.length}`);
    }
    return arr.map((s) => String(s).trim());
  } catch (err) {
    console.warn(`[llm] translateLines failed: ${err.message}. Returning source.`);
    return lines;
  }
}

/* ----------------------------- leanScore --------------------------------- */
/** 사설 본문(또는 본문이 짧으면 title+summary+stance)을 읽고
 *  진보(1) ~ 보수(5) 정수 스케일로 점수.
 *
 *  반환: { score, label, rationale } 또는 null (증거 부족 / API 실패).
 *  null인 경우 호출자가 그대로 저장 — 가짜 "Center" 점수로 채우지 않는다.
 */
export async function leanScore({ title, body, summary, stance, lang }) {
  if (!KEY) return null;

  // body가 충분히 길면 우선 사용, 짧으면 title + summary + stance로 폴백.
  // 한국경제처럼 파서가 본문을 못 가져오는 매체도 점수가 나오도록.
  const summaryText = Array.isArray(summary) ? summary.filter(Boolean).join(" ") : "";
  const hasFullBody = body && body.length > 200;
  const evidence = hasFullBody
    ? body.slice(0, 4000)
    : [body || "", summaryText, stance || ""].map((s) => s.trim()).filter(Boolean).join("\n\n");

  if (!evidence || evidence.length < 30) return null;

  const L = lang === "ko" ? "Korean" : "English";

  const prompt = `You are a media-bias analyst rating a Korean newspaper editorial on a 1–5 left/right scale.

SCALE:
1 = Strongly progressive (left)
2 = Lean progressive
3 = Center / genuinely balanced — RARE; only when the editorial truly weighs both sides with no clear tilt
4 = Lean conservative
5 = Strongly conservative (right)

CRITICAL INSTRUCTIONS:
- Editorials are opinion pieces by nature. Most editorials lean clearly one way.
- DO NOT default to 3 when uncertain. If you must guess, pick 2 or 4 based on which direction the framing tilts.
- 3 should be the LEAST common score across editorials. Reserve it for genuinely balanced pieces.
- Judge THIS specific editorial's argument and framing — do NOT score based on the outlet's reputation.

KOREAN POLITICAL SIGNALS (use these to calibrate):
Progressive (1-2): criticizes 재벌/대기업; defends 노조/노동자; supports 복지 확대, 부동산 규제, 증세, 검찰 견제; advocates 대북 대화/평화; questions 한미동맹 비용/주한미군 부담; frames inequality as structural.
Conservative (4-5): criticizes 노조 강경/파업; defends 시장경제, 규제 완화, 감세; supports 한미동맹 강화, 대북 강경, 안보, 법치; defends 기업/투자 환경; frames welfare as moral hazard or fiscal risk.

WHAT TO LOOK AT: who is criticized vs defended, what policies are advocated, what framing words are chosen, what is treated as common sense vs contested.

Title: ${title}
Evidence:
"""
${evidence}
"""

Return STRICT JSON, no prose:
{
  "score": 1-5 (integer),
  "label": "Strongly progressive" | "Lean progressive" | "Center" | "Lean conservative" | "Strongly conservative",
  "rationale": "one short sentence in ${L} naming a specific signal from the text"
}`;

  try {
    const text = await callClaude(prompt, 300);
    const parsed = JSON.parse(extractJson(text));
    const rawScore = Number(parsed.score);
    if (!Number.isFinite(rawScore)) return null;
    const score = Math.max(1, Math.min(5, Math.round(rawScore)));
    return {
      score,
      label: String(parsed.label || "").slice(0, 40),
      rationale: String(parsed.rationale || "").slice(0, 400),
    };
  } catch (err) {
    console.warn(`[llm] leanScore failed: ${err.message}`);
    return null;
  }
}

/* ----------------------------- perspective -------------------------------- */
/** "오늘의 관점" — 해당 매체가 이 이슈를 오늘 어떻게 다루는지 2~4단어로. 원문 언어 유지. */
export async function perspective({ title, summary, lang }) {
  if (!KEY || !title) return "";
  const langName = lang === "ko" ? "Korean" : "English";
  const summaryText = Array.isArray(summary) ? summary.join(" ") : (summary || "");
  const prompt = `You are a wry political-media critic. Read this newspaper editorial and return a 2–4 word tag describing the NEWSPAPER'S SPECIFIC STANCE TODAY on this issue — not a generic political label. Be specific, a little playful, evocative. Use ${langName}.

Title: ${title}
Summary: ${summaryText.slice(0, 600)}

Return ONLY the tag text. No quotes, no punctuation at the end. Examples of good tags: "cautious optimism", "알람 울리는 중", "market purist", "신중한 낙관", "institutional skepticism".`;
  try {
    const out = await callClaude(prompt, 80);
    return out
      .trim()
      .replace(/^["'\u201c\u2018]+|["'\u201d\u2019.]+$/g, "")
      .slice(0, 40);
  } catch (err) {
    console.warn(`[llm] perspective failed: ${err.message}`);
    return "";
  }
}
