// Option C: Reading Room — Main 4 (full) + Secondary 4 (title-only, click to expand).
// Priority: (1) editorial title, (2) 3-line summary, (3) top-3 headlines — all visible on main 4.
// Secondary 4 show only title + outlet; click expands summary + top3.

const { useState: useStateC, useEffect: useEffectC } = React;

// "Today's perspective" tag is pre-computed in the crawler (lib/llm.js) and
// stored as editorial.perspective. If missing (LLM call failed, or no key),
// fall back to the outlet's static leanEn label so the card always has *something*.
function PerspectiveTag({ outlet, size = "sm" }) {
  const tag =
    outlet.editorial?.perspective ||
    outlet.editorial?.stance ||
    outlet.leanEn ||
    outlet.lean ||
    "";
  const px = size === "sm" ? { fs: 9, pad: "2px 6px" } : { fs: 10, pad: "3px 7px" };
  return (
    <span title="today's editorial perspective" style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: outlet.lang === "ko"
        ? `'Noto Serif KR', serif`
        : `'Playfair Display', serif`,
      fontStyle: outlet.lang === "ko" ? "normal" : "italic",
      fontSize: px.fs + 1,
      padding: px.pad,
      color: outlet.leanColor,
      background: `${outlet.leanColor}11`,
      border: `1px solid ${outlet.leanColor}33`,
      letterSpacing: outlet.lang === "ko" ? "-0.01em" : "0",
      textTransform: "none",
      whiteSpace: "nowrap",
      maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis",
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: "50%",
        background: outlet.leanColor,
      }} />
      {tag}
    </span>
  );
}

function OptionCReadingRoom() {
  const outlets = window.OUTLETS;
  const [readerOutlet, setReaderOutlet] = useStateC(null);
  const [expandedId, setExpandedId] = useStateC(null);

  // Top row (left → right): KT, 한국일보, 조선일보, 중앙일보.
  // Bottom row: 코리아헤럴드, 한겨레, 매일경제, 한국경제.
  const mainIds = ["koreatimes", "hankook", "chosun", "joongang"];
  const subIds = ["heraldcorp", "hani", "mk", "hankyung"];
  const byId = Object.fromEntries(outlets.map(o => [o.id, o]));
  const mains = mainIds.map(id => byId[id]).filter(Boolean);
  const subs = subIds.map(id => byId[id]).filter(Boolean);

  return (
    <div style={{
      background: "#faf6ec",
      color: "#1a1713",
      minHeight: "100%",
      fontFamily: `'Source Serif 4', 'Noto Serif KR', Georgia, serif`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Compact header */}
      <header style={{
        borderBottom: "1px solid #e5dfd2",
        padding: "14px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20, background: "#fbf8f1",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{
            fontFamily: `'Playfair Display', 'Noto Serif KR', serif`,
            fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em",
            margin: 0,
          }}>사설</h1>
          <span style={{
            fontFamily: `'Playfair Display', serif`,
            fontStyle: "italic", fontSize: 13, color: "#7a7264",
          }}>the reading room</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: 10, color: "#7a7264",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>SAT · APR 18 · 2026 · 8 OUTLETS</div>
          <window.CrawlStatus compact />
        </div>
      </header>

      {/* Main 4 — full detail. flex:1 so the row stretches to fill viewport. */}
      <main className="ed-row" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        flex: 1,
        minHeight: 0,
      }}>
        {mains.map((o, i) => (
          <MainCell
            key={o.id} outlet={o}
            rightBorder={i < 3}
            onReader={() => setReaderOutlet(o)}
          />
        ))}
      </main>

      {/* Secondary 4 — title only, expand on click */}
      <section style={{
        borderTop: "2px solid #1a1713",
        background: "#f5efe2",
      }}>
        <div style={{
          padding: "10px 32px",
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 10, color: "#7a7264",
          textTransform: "uppercase", letterSpacing: "0.2em",
          borderBottom: "1px solid #e5dfd2",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>Also today · 나머지 사설</span>
          <span style={{ opacity: 0.6 }}>click to expand</span>
        </div>
        <div className="ed-row" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
        }}>
          {subs.map((o, i) => (
            <SubCell
              key={o.id} outlet={o}
              rightBorder={i < 3}
              expanded={expandedId === o.id}
              onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)}
              onReader={() => setReaderOutlet(o)}
            />
          ))}
        </div>
      </section>

      <window.TranslateReader outlet={readerOutlet} open={!!readerOutlet} onClose={() => setReaderOutlet(null)} />
    </div>
  );
}

function MainCell({ outlet, rightBorder, onReader }) {
  const ed = outlet.editorial;
  const isKo = outlet.lang === "ko";
  const titleFont = isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`;
  const bodyFont = isKo ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`;

  return (
    <article className="ed-cell ed-main-cell" style={{
      padding: "26px 28px 22px",
      borderRight: rightBorder ? "1px solid #e5dfd2" : "none",
      display: "grid",
      gridTemplateRows: "auto auto auto 1fr",
      gap: 16,
      minHeight: 0,
    }}>
      {/* Outlet meta */}
      <header style={{
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 12, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        <window.OutletLogo outlet={outlet} size={24} />
        <a href={outlet.url} target="_blank" rel="noopener" style={{
          fontFamily: titleFont,
          fontSize: 16, fontWeight: 700, color: "#1a1713",
          textDecoration: "none", letterSpacing: isKo ? "-0.02em" : "0",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{outlet.name}</a>
        <PerspectiveTag outlet={outlet} size="md" />
      </header>

      {/* PRIMARY 1: Title */}
      <h2 className="ed-main-title" onClick={onReader} style={{
        fontFamily: titleFont,
        fontSize: 24, lineHeight: 1.22, fontWeight: 800,
        letterSpacing: isKo ? "-0.03em" : "-0.015em",
        margin: 0, color: "#1a1713",
        cursor: "pointer", textWrap: "pretty",
      }}
        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
      >{ed.title}</h2>

      {/* PRIMARY 2: 3-line summary, with fallbacks for gated / body-less outlets */}
      <SummaryOrFallback ed={ed} outlet={outlet} bodyFont={bodyFont} size="md" />

      {/* PRIMARY 3: Top 3 (hidden when empty — we don't yet populate top3) */}
      {outlet.top3?.length > 0 && (
        <div style={{
          borderTop: "1px dotted #c9c0ad",
          paddingTop: 10,
          alignSelf: "end",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: 9, color: "#7a7264",
            textTransform: "uppercase", letterSpacing: "0.15em",
            marginBottom: 6,
          }}>
            <span>Top 3</span>
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {outlet.top3.map((t, i) => (
              <li key={i} style={{
                display: "grid", gridTemplateColumns: "16px 1fr", gap: 6,
                padding: "4px 0",
                borderBottom: i < 2 ? "1px dotted #e5dfd2" : "none",
              }}>
                <span style={{
                  fontFamily: `'IBM Plex Mono', monospace`,
                  fontSize: 9, color: outlet.leanColor, fontWeight: 700, paddingTop: 2,
                }}>0{i + 1}</span>
                <a href={outlet.url} target="_blank" rel="noopener" style={{
                  fontFamily: bodyFont,
                  fontSize: 12.5, lineHeight: 1.4, color: "#27231c",
                  textDecoration: "none",
                  display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>{t}</a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Source link — always present so gated/no-body cards still have a clear CTA */}
      <div style={{
        alignSelf: "end",
        marginTop: "auto",
        paddingTop: 8,
        borderTop: "1px dotted #c9c0ad",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.1em",
        width: "100%",
      }}>
        <a href={ed.sourceUrl || outlet.editorialUrl} target="_blank" rel="noopener" style={{
          color: "#4a4237", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          {isKo ? "원문 읽기" : "Read source"} <window.ExternalIcon size={10} />
        </a>
        <button onClick={onReader} style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 9, padding: "4px 8px",
          background: "#1a1713", color: "#faf6ec",
          border: "none", cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.1em",
          display: "inline-flex", alignItems: "center", gap: 3,
        }}>
          <window.TranslateIcon size={9} />
          {isKo ? "EN" : "KO"}
        </button>
      </div>
    </article>
  );
}

// Summary fallback ladder:
//   summary[] → pullQuote → body snippet → outlet-specific notice.
// Two guards against empty-looking cards:
//   (1) For gated outlets, skip the body snippet — it's usually the RSS/Google
//       News description which is just the headline repeated.
//   (2) If body is near-duplicate of title (length within ~1.5x and contains
//       the title), treat it as no-useful-body and fall through to the notice.
function isBodyUseful(body, title) {
  if (!body || body.length < 30) return false;
  if (!title) return true;
  const nb = body.replace(/\s+/g, " ").trim();
  const nt = title.replace(/\s+/g, " ").trim();
  if (nb.length < nt.length * 1.5) {
    // Body isn't much longer than title — check if it's just a restatement.
    const head = nt.slice(0, Math.min(20, nt.length));
    if (nb.includes(head)) return false;
  }
  return true;
}

function SummaryOrFallback({ ed, outlet, bodyFont, size }) {
  const fs = size === "md" ? 16 : 14;
  const lh = size === "md" ? 1.55 : 1.5;
  const isKo = outlet.lang === "ko";

  let lines = null;
  if (ed.summary?.length) {
    lines = ed.summary;
  } else if (ed.pullQuote && ed.pullQuote !== ed.title) {
    lines = [ed.pullQuote];
  } else if (!ed.gated && isBodyUseful(ed.body, ed.title)) {
    lines = [ed.body.slice(0, 220) + (ed.body.length > 220 ? "…" : "")];
  }

  return (
    <div style={{
      paddingLeft: 10,
      borderLeft: `3px solid ${outlet.leanColor}`,
      display: "flex", flexDirection: "column", gap: size === "md" ? 4 : 3,
    }}>
      {lines ? lines.map((s, i) => (
        <div key={i} className={size === "md" ? "ed-summary-md" : "ed-summary-sm"} style={{
          fontFamily: bodyFont,
          fontSize: fs, lineHeight: lh, color: "#3a3428",
          textWrap: "pretty",
        }}>{s}</div>
      )) : (
        <div style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 11, color: "#7a7264",
          lineHeight: 1.5,
        }}>
          {ed.gated
            ? (isKo ? "유료 매체 · 저작권 정책상 제목과 원문 링크만 제공합니다." : "Subscription outlet · headline + source link only, per copyright policy.")
            : (isKo ? "이 매체는 본문이 브라우저 렌더링 기반이라 자동 수집이 안 됩니다. 아래 ‘원문 읽기’로 이동해주세요." : "This outlet renders body content client-side; full text available at source only.")}
        </div>
      )}
    </div>
  );
}

function SubCell({ outlet, rightBorder, expanded, onToggle, onReader }) {
  const ed = outlet.editorial;
  const isKo = outlet.lang === "ko";
  const titleFont = isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`;
  const bodyFont = isKo ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`;

  return (
    <article className="ed-cell ed-sub-cell" style={{
      padding: "20px 24px",
      borderRight: rightBorder ? "1px solid #e5dfd2" : "none",
      background: expanded ? "#fbf8f1" : "transparent",
      cursor: "pointer",
      transition: "background 0.15s",
    }} onClick={onToggle}>
      {/* Outlet meta + chevron */}
      <header style={{
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 11, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 10,
      }}>
        <window.OutletLogo outlet={outlet} size={20} />
        <span style={{
          fontFamily: titleFont,
          fontSize: 13, fontWeight: 700, color: "#1a1713",
          letterSpacing: isKo ? "-0.02em" : "0",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{outlet.name}</span>
        <PerspectiveTag outlet={outlet} size="sm" />
        <span style={{
          marginLeft: "auto",
          fontSize: 13,
          transform: expanded ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.15s",
          color: "#7a7264",
        }}>▾</span>
      </header>

      {/* Title — always visible */}
      <h3 className="ed-sub-title" style={{
        fontFamily: titleFont,
        fontSize: 18, lineHeight: 1.3, fontWeight: 700,
        letterSpacing: isKo ? "-0.025em" : "-0.01em",
        margin: 0, color: "#1a1713",
        textWrap: "pretty",
      }}>{ed.title}</h3>

      {/* 3-line summary — with fallback */}
      <div style={{ marginTop: 10 }}>
        <SummaryOrFallback ed={ed} outlet={outlet} bodyFont={bodyFont} size="sm" />
      </div>

      {/* Expanded content — top 3 (if populated) + translate button */}
      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid #e5dfd2",
          cursor: "default",
        }}>
          {outlet.top3?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontFamily: `'IBM Plex Mono', monospace`,
                fontSize: 9, color: "#7a7264",
                textTransform: "uppercase", letterSpacing: "0.15em",
                marginBottom: 5,
              }}>Top 3</div>
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {outlet.top3.map((t, i) => (
                  <li key={i} style={{
                    display: "grid", gridTemplateColumns: "16px 1fr", gap: 6,
                    padding: "3px 0",
                    borderBottom: i < 2 ? "1px dotted #e5dfd2" : "none",
                  }}>
                    <span style={{
                      fontFamily: `'IBM Plex Mono', monospace`,
                      fontSize: 9, color: outlet.leanColor, fontWeight: 700, paddingTop: 2,
                    }}>0{i + 1}</span>
                    <a href={outlet.url} target="_blank" rel="noopener" style={{
                      fontFamily: bodyFont,
                      fontSize: 12, lineHeight: 1.4, color: "#27231c",
                      textDecoration: "none",
                      display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>{t}</a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href={ed.sourceUrl || outlet.editorialUrl} target="_blank" rel="noopener" style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 9, padding: "5px 10px",
              background: "transparent", color: "#4a4237",
              border: "1px solid #c9c0ad", textDecoration: "none",
              textTransform: "uppercase", letterSpacing: "0.1em",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              {isKo ? "원문 읽기" : "Read source"}
              <window.ExternalIcon size={9} />
            </a>
            <button onClick={onReader} style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 9, padding: "5px 10px",
              background: "#1a1713", color: "#faf6ec",
              border: "none", cursor: "pointer",
              textTransform: "uppercase", letterSpacing: "0.1em",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <window.TranslateIcon size={9} />
              {isKo ? "Read in English" : "한국어로 읽기"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

window.OptionCReadingRoom = OptionCReadingRoom;
