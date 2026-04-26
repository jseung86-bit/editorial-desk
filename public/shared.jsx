// Shared utilities and components for all three layout options.
// Exposes: window.useTranslate, window.OutletLogo, window.LeanBadge, window.TranslateReader,
//          window.CrawlStatus, window.ExternalIcon, window.TranslateIcon

const { useState, useEffect, useCallback, useRef } = React;

/* ----------------------------- Translation hook ---------------------------- */
// Translations are PRE-COMPUTED by the crawler (lib/llm.js) and stored on each
// outlet's editorial as titleTr / summaryTr / bodyTr. The browser has no
// Anthropic access (window.claude is Artifacts-only), so this hook is a pure
// synchronous lookup over window.OUTLETS — no network calls.
//
// cacheKey convention (set by callers):
//   "${outletId}-title"   → editorial.titleTr
//   "${outletId}-summary" → editorial.summaryTr.join("\n")
//   "${outletId}-body"    → editorial.bodyTr
// Missing translations return status "unavailable" so UI can render a notice
// instead of a forever-spinning skeleton.

function detectLang(text) {
  // Quick heuristic: if >20% of characters are Hangul, treat as Korean.
  if (!text) return "ko";
  let hangul = 0, total = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    total++;
    if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(ch)) hangul++;
  }
  return total > 0 && hangul / total > 0.2 ? "ko" : "en";
}

window.detectLang = detectLang;

function lookupTranslation(cacheKey) {
  const outlets = window.OUTLETS || [];
  const match = /^(.+?)-(title|body|summary)$/.exec(cacheKey || "");
  if (!match) return { found: false, text: "" };
  const [, outletId, field] = match;
  const outlet = outlets.find(o => o.id === outletId);
  if (!outlet) return { found: false, text: "" };
  const ed = outlet.editorial || {};
  if (field === "title") return { found: !!ed.titleTr, text: ed.titleTr || "" };
  if (field === "summary") {
    const arr = ed.summaryTr || [];
    return { found: arr.length > 0, text: arr.join("\n") };
  }
  if (field === "body") return { found: !!ed.bodyTr, text: ed.bodyTr || "" };
  return { found: false, text: "" };
}

window.useTranslate = function useTranslate() {
  const [state, setState] = useState({});

  const translate = useCallback((cacheKey /*, sourceText, targetLang */) => {
    const { found, text } = lookupTranslation(cacheKey);
    setState(s => ({
      ...s,
      [cacheKey]: found ? { status: "done", text } : { status: "unavailable" },
    }));
    return Promise.resolve(found ? text : null);
  }, []);

  return { state, translate };
};

/* -------------------------------- Icons ----------------------------------- */
window.ExternalIcon = function ExternalIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M17 7H9M17 7V15" />
    </svg>
  );
};

window.TranslateIcon = function TranslateIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h10M9 3v2M11 5c0 5-4 8-7 9M7 9c0 3 3 6 8 7" />
      <path d="M13 20l4-10 4 10M14.5 17h5" />
    </svg>
  );
};

window.CloseIcon = function CloseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
};

/* ------------------------------ Outlet logo ------------------------------- */
// Placeholder logo — monogram in brand-like style. Uses leanColor as accent.
window.OutletLogo = function OutletLogo({ outlet, size = 36, variant = "square" }) {
  const initial = outlet.lang === "ko"
    ? outlet.name.slice(0, 2)
    : outlet.name.replace(/^The\s+/i, "").split(/\s+/).map(w => w[0]).slice(0, 2).join("");
  const fontFamily = outlet.lang === "ko"
    ? `'Nanum Myeongjo', 'Noto Serif KR', serif`
    : `'Playfair Display', 'Times New Roman', serif`;
  return (
    <div style={{
      width: size, height: size,
      background: outlet.leanColor,
      color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily,
      fontWeight: 700,
      fontSize: size * 0.38,
      letterSpacing: outlet.lang === "ko" ? "-0.04em" : "0.02em",
      borderRadius: variant === "circle" ? "50%" : 2,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
};

/* ------------------------------- Lean badge ------------------------------- */
window.LeanBadge = function LeanBadge({ outlet, showEn = false, size = "sm" }) {
  const px = size === "sm" ? { fs: 10, pad: "2px 6px" } : { fs: 11, pad: "3px 8px" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: px.fs,
      padding: px.pad,
      border: `1px solid ${outlet.leanColor}40`,
      color: outlet.leanColor,
      background: `${outlet.leanColor}0c`,
      borderRadius: 2,
      fontFamily: `'IBM Plex Mono', monospace`,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 500,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: outlet.leanColor }} />
      {showEn ? outlet.leanEn : outlet.lean}
    </span>
  );
};

/* ----------------------------- Crawl status ------------------------------- */
window.CrawlStatus = function CrawlStatus({ compact = false }) {
  const meta = window.CRAWL_META;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontFamily: `'IBM Plex Mono', monospace`,
      fontSize: compact ? 10 : 11,
      color: "#7a7264",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "#3a9a5a",
        boxShadow: "0 0 0 3px #3a9a5a22",
      }} />
      <span>Last sync · {meta.lastSync}</span>
      {!compact && <span style={{ opacity: 0.5 }}>|</span>}
      {!compact && <span style={{ opacity: 0.6 }}>{meta.outletCount} outlets</span>}
    </div>
  );
};

/* ------------------------- Translate reader overlay ----------------------- */
// Modal with split-pane original vs translated view.
// `editorial` is optional — when omitted (Option A/B), falls back to outlet.editorial
// (singular). When provided (Option C, post multi-editorial change), reads that specific
// item. Cache keys include a per-editorial discriminator so translations of two
// editorials from the same outlet don't collide.
window.TranslateReader = function TranslateReader({ outlet, editorial, open, onClose }) {
  const { state, translate } = window.useTranslate();
  const ed = editorial || outlet?.editorial;
  const sourceLang = outlet?.lang || "en";
  const targetLang = sourceLang === "ko" ? "en" : "ko";

  // Stable per-editorial discriminator: prefer sourceUrl tail, fall back to date.
  const edDisc = ed
    ? (ed.sourceUrl ? ed.sourceUrl.slice(-16) : (ed.date || "0"))
    : "0";
  const titleKey = outlet ? `${outlet.id}-${edDisc}-title` : null;
  const bodyKey = outlet ? `${outlet.id}-${edDisc}-body` : null;
  const summaryKey = outlet ? `${outlet.id}-${edDisc}-summary` : null;

  useEffect(() => {
    if (!open || !outlet || !ed) return;
    translate(titleKey, ed.title, targetLang);
    translate(bodyKey, ed.body, targetLang);
    translate(summaryKey, (ed.summary || []).join("\n"), targetLang);
  }, [open, outlet?.id, edDisc]);

  // ESC로 모달 닫기. capture 단계 핸들러로 다른 리스너보다 먼저 발화.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !outlet) return null;

  const titleT = state[titleKey];
  const bodyT = state[bodyKey];
  const summaryT = state[summaryKey];
  const isKo = sourceLang === "ko";

  const labels = {
    original: isKo ? "원문 (한국어)" : "Original (English)",
    translated: isKo ? "Translation (English)" : "번역 (한국어)",
    summary: isKo ? "3줄 요약" : "3-line summary",
    summaryT: isKo ? "3-line summary" : "3줄 요약",
  };

  return (
    <div
      className="ed-modal"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(20, 18, 14, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
        padding: "40px 24px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="ed-modal-inner"
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(1280px, 100%)",
          background: "#fbf8f1",
          borderRadius: 4,
          display: "flex", flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="ed-modal-header" style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "16px 24px",
          borderBottom: "1px solid #e5dfd2",
          background: "#f5efe2",
        }}>
          <window.OutletLogo outlet={outlet} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: outlet.lang === "ko" ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
              fontSize: 16, fontWeight: 600,
            }}>{outlet.name}</div>
            <div style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 10, color: "#7a7264",
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginTop: 2,
            }}>
              Editorial · {ed.date} · {outlet.country}
            </div>
          </div>
          <window.LeanBadge outlet={outlet} showEn={!isKo} />
          <a
            href={outlet.editorialUrl}
            target="_blank" rel="noopener"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "#4a4237",
              fontFamily: `'IBM Plex Mono', monospace`,
              textTransform: "uppercase", letterSpacing: "0.08em",
              textDecoration: "none",
              padding: "6px 10px", border: "1px solid #c9c0ad",
              background: "#fff",
            }}
          >
            원문 사이트 <window.ExternalIcon size={12} />
          </a>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #c9c0ad",
            padding: 8, cursor: "pointer", color: "#4a4237",
          }}>
            <window.CloseIcon size={14} />
          </button>
        </div>

        {/* Split pane */}
        <div className="ed-modal-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, overflow: "auto" }}>
          {/* Original */}
          <div className="ed-modal-pane" style={{
            padding: "32px 36px", overflow: "auto",
            borderRight: "1px solid #e5dfd2",
            fontFamily: outlet.lang === "ko" ? `'Noto Serif KR', serif` : `'Source Serif 4', 'Playfair Display', serif`,
          }}>
            <PaneHeader label={labels.original} side="original" />
            <h1 style={{
              fontSize: 30, lineHeight: 1.25, fontWeight: 700,
              margin: "0 0 20px", letterSpacing: outlet.lang === "ko" ? "-0.02em" : "-0.01em",
            }}>{ed.title}</h1>
            <SummaryBlock items={ed.summary} label={labels.summary} lang={outlet.lang} />
            <p style={{ fontSize: 16.5, lineHeight: 1.75, color: "#27231c", margin: 0 }}>
              {ed.body}
            </p>
          </div>
          {/* Translation */}
          <div className="ed-modal-pane" style={{
            padding: "32px 36px", overflow: "auto",
            background: "#f7f1e3",
            fontFamily: targetLang === "ko" ? `'Noto Serif KR', serif` : `'Source Serif 4', 'Playfair Display', serif`,
          }}>
            <PaneHeader label={labels.translated} side="translated" />
            <TranslatedBlock item={titleT} asTitle lang={targetLang} />
            <SummaryTranslated item={summaryT} label={labels.summaryT} lang={targetLang} />
            <TranslatedBlock item={bodyT} lang={targetLang} />
          </div>
        </div>
      </div>
    </div>
  );
};

function PaneHeader({ label, side }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 20,
      fontFamily: `'IBM Plex Mono', monospace`,
      fontSize: 10, color: "#7a7264",
      textTransform: "uppercase", letterSpacing: "0.12em",
    }}>
      <span style={{
        width: 14, height: 1, background: "#7a7264",
      }} />
      <span>{label}</span>
      {side === "translated" && (
        <span style={{
          marginLeft: "auto",
          padding: "2px 6px", border: "1px solid #7a726440",
          fontSize: 9,
        }}>AI · Claude</span>
      )}
    </div>
  );
}

function SummaryBlock({ items, label, lang }) {
  return (
    <div style={{
      borderLeft: "3px solid #c9c0ad",
      paddingLeft: 16, marginBottom: 24,
    }}>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 8,
      }}>{label}</div>
      {items.map((it, i) => (
        <div key={i} style={{
          fontSize: 14.5, lineHeight: 1.6, color: "#3a3428",
          marginBottom: 4,
        }}>— {it}</div>
      ))}
    </div>
  );
}

function TranslatedBlock({ item, asTitle, lang }) {
  if (!item || item.status === "loading") {
    return <Skeleton asTitle={asTitle} />;
  }
  if (item.status === "unavailable") {
    return (
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 11, color: "#7a7264",
        padding: "10px 0",
        borderTop: "1px dashed #c9c0ad",
        borderBottom: "1px dashed #c9c0ad",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        {lang === "ko" ? "본문 번역 없음 · 원문 사이트에서 확인" : "full-body translation not available · see source"}
      </div>
    );
  }
  if (item.status === "error") {
    return <div style={{ color: "#b83a2b", fontSize: 14 }}>번역 실패 · Retry failed</div>;
  }
  if (asTitle) {
    return <h1 style={{
      fontSize: 30, lineHeight: 1.25, fontWeight: 700,
      margin: "0 0 20px", letterSpacing: lang === "ko" ? "-0.02em" : "-0.01em",
    }}>{item.text}</h1>;
  }
  return <p style={{ fontSize: 16.5, lineHeight: 1.75, color: "#27231c", margin: 0 }}>{item.text}</p>;
}

function SummaryTranslated({ item, label, lang }) {
  const lines = item?.status === "done" ? item.text.split("\n").filter(Boolean) : [];
  return (
    <div style={{
      borderLeft: "3px solid #c9c0ad",
      paddingLeft: 16, marginBottom: 24,
    }}>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 8,
      }}>{label}</div>
      {item?.status === "unavailable" ? (
        <div style={{ fontSize: 13, color: "#7a7264", fontStyle: "italic" }}>
          {lang === "ko" ? "요약 번역 없음" : "summary translation not available"}
        </div>
      ) : item?.status === "loading" || !item ? (
        <>
          <Skeleton line />
          <Skeleton line />
          <Skeleton line />
        </>
      ) : lines.map((l, i) => (
        <div key={i} style={{
          fontSize: 14.5, lineHeight: 1.6, color: "#3a3428",
          marginBottom: 4,
        }}>— {l.replace(/^[—-]\s*/, "")}</div>
      ))}
    </div>
  );
}

function Skeleton({ asTitle, line }) {
  const h = asTitle ? 28 : line ? 14 : 16;
  const widths = asTitle ? ["80%", "55%"] : line ? ["90%"] : ["100%", "95%", "97%", "60%"];
  return (
    <div style={{ marginBottom: asTitle ? 20 : 6 }}>
      {widths.map((w, i) => (
        <div key={i} style={{
          height: h, width: w,
          background: "linear-gradient(90deg, #e8e0cd 0%, #f2ebd9 50%, #e8e0cd 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite linear",
          marginBottom: 6, borderRadius: 2,
        }} />
      ))}
    </div>
  );
}

/* -------------------------- Inline translate chip ------------------------- */
// Small in-card translator: swaps an element's text with its translation on click.
window.InlineTranslate = function InlineTranslate({ cacheKey, sourceText, sourceLang, onResult, label }) {
  const { state, translate } = window.useTranslate();
  const targetLang = sourceLang === "ko" ? "en" : "ko";
  const s = state[cacheKey];
  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const text = await translate(cacheKey, sourceText, targetLang);
    if (text && onResult) onResult(text);
  };
  return (
    <button
      onClick={handleClick}
      title={sourceLang === "ko" ? "영어로 번역" : "한국어로 번역"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10,
        padding: "3px 8px",
        border: "1px solid #c9c0ad",
        background: s?.status === "done" ? "#2a2620" : "transparent",
        color: s?.status === "done" ? "#fbf8f1" : "#4a4237",
        cursor: "pointer",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}
    >
      <window.TranslateIcon size={11} />
      {s?.status === "loading" ? "..." : (label || (sourceLang === "ko" ? "EN" : "한"))}
    </button>
  );
};

/* ------------------------------- Animations ------------------------------- */
const style = document.createElement("style");
style.textContent = `
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
`;
document.head.appendChild(style);
