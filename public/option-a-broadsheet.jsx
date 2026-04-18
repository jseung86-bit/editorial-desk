// Option A: Broadsheet Grid (Deep) — classic broadsheet newspaper treatment.
// Main 4: chosun, wsj, hankook, koreatimes  (2x2 lead grid)
// Bottom 4: joongang, koreaherald, nyt, ft   (4-col strip)

const { useState: useStateA, useMemo: useMemoA } = React;

const MAIN_IDS = ["chosun", "wsj", "hankook", "koreatimes"];
const BOTTOM_IDS = ["joongang", "koreaherald", "nyt", "ft"];

function OptionABroadsheet() {
  const [readerOutlet, setReaderOutlet] = useStateA(null);
  const [expandedId, setExpandedId] = useStateA(null);
  const outlets = window.OUTLETS;
  const byId = useMemoA(() => Object.fromEntries(outlets.map(o => [o.id, o])), [outlets]);

  const mains = MAIN_IDS.map(id => byId[id]).filter(Boolean);
  const bottoms = BOTTOM_IDS.map(id => byId[id]).filter(Boolean);

  return (
    <div style={{
      background: "#f5efe2",
      minHeight: "100%",
      fontFamily: `'Source Serif 4', 'Noto Serif KR', Georgia, serif`,
      color: "#1a1713",
    }}>
      <Masthead />
      <IssueIndex />
      <MarketStrip />

      <section style={{
        padding: "24px 56px 0",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        borderTop: "3px double #1a1713",
      }}>
        {mains.map((o, i) => (
          <MainLeadCard
            key={o.id} outlet={o}
            onOpen={() => setReaderOutlet(o)}
            onExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
            expanded={expandedId === o.id}
            rightBorder={i % 2 === 0}
            topBorder={i > 1}
          />
        ))}
      </section>

      <CrossCompare byId={byId} onOpenReader={o => setReaderOutlet(o)} />

      <section style={{ padding: "0 56px 48px" }}>
        <SectionHeader kicker="Also on the desk" title="from the other bureaux" count={bottoms.length} />
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          borderTop: "2px solid #1a1713",
        }}>
          {bottoms.map((o, i) => (
            <BottomStandardCard
              key={o.id} outlet={o}
              onOpen={() => setReaderOutlet(o)}
              rightBorder={i < 3}
            />
          ))}
        </div>
      </section>

      <Colophon />
      <window.TranslateReader outlet={readerOutlet} open={!!readerOutlet} onClose={() => setReaderOutlet(null)} />
    </div>
  );
}

function Masthead() {
  return (
    <header style={{ padding: "36px 56px 20px", background: "#f5efe2", textAlign: "center" }}>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.3em",
        marginBottom: 8,
      }}>SASEOL · The Editorial Desk · Vol. I · No. 108 · Four cents</div>
      <h1 style={{
        fontFamily: `'Playfair Display', 'Noto Serif KR', serif`,
        fontSize: 104, fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.035em",
        margin: "0 0 4px",
      }}><span>사</span><span style={{ margin: "0 0.05em" }}>·</span><span>설</span></h1>
      <div style={{
        fontFamily: `'Playfair Display', serif`,
        fontSize: 22, fontStyle: "italic", fontWeight: 400,
        color: "#4a4237", letterSpacing: "0.02em", marginBottom: 14,
      }}>The Editorial Desk · a daily collation of opinion</div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 0",
        borderTop: "1px solid #1a1713", borderBottom: "1px solid #1a1713",
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 11, color: "#1a1713",
        textTransform: "uppercase", letterSpacing: "0.14em",
      }}>
        <span>Saturday, April 18, 2026</span>
        <span style={{ fontWeight: 600 }}>SEOUL · NEW YORK · LONDON</span>
        <window.CrawlStatus compact />
      </div>
    </header>
  );
}

function IssueIndex() {
  const topics = [
    { num: "01", label: "AI Regulation", ko: "AI 규제", hot: true },
    { num: "02", label: "Tariffs", ko: "관세" },
    { num: "03", label: "Climate", ko: "기후" },
    { num: "04", label: "Geopolitics", ko: "외교" },
    { num: "05", label: "Monetary Policy", ko: "통화정책" },
    { num: "06", label: "Pension", ko: "연금" },
    { num: "07", label: "Capital Markets", ko: "자본시장" },
  ];
  return (
    <nav style={{
      padding: "14px 56px", background: "#ebe4d2",
      borderBottom: "1px solid #c9c0ad",
      display: "flex", gap: 24, flexWrap: "wrap",
      fontFamily: `'IBM Plex Mono', monospace`,
      fontSize: 10, color: "#4a4237",
      textTransform: "uppercase", letterSpacing: "0.14em", alignItems: "center",
    }}>
      <span style={{ fontWeight: 700, color: "#1a1713" }}>Today's issues</span>
      {topics.map(t => (
        <a key={t.num} href="#" onClick={e => e.preventDefault()} style={{
          display: "inline-flex", alignItems: "baseline", gap: 6,
          color: "inherit", textDecoration: "none",
        }}>
          <span style={{ color: "#a89b82", fontWeight: 500 }}>{t.num}</span>
          <span>{t.label}</span>
          <span style={{ color: "#a89b82" }}>/</span>
          <span style={{ fontFamily: `'Noto Serif KR', serif`, letterSpacing: "-0.02em" }}>{t.ko}</span>
          {t.hot && <span style={{ fontSize: 8, color: "#B8342B", fontWeight: 700, marginLeft: 2 }}>●</span>}
        </a>
      ))}
    </nav>
  );
}

function MarketStrip() {
  const items = window.MARKET_STRIP;
  return (
    <div style={{
      display: "flex", padding: "0 56px",
      background: "#1a1713", color: "#ebe4d2", overflowX: "auto",
    }}>
      {items.map((m, i) => (
        <div key={i} style={{
          padding: "10px 16px",
          borderRight: i < items.length - 1 ? "1px solid #2e2a22" : "none",
          display: "flex", gap: 8, alignItems: "baseline",
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 11, whiteSpace: "nowrap",
        }}>
          <span style={{ color: "#a89b82", textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</span>
          <span style={{ fontWeight: 600 }}>{m.value}</span>
          <span style={{
            color: m.up === true ? "#6bb87c" : m.up === false ? "#d96b6b" : "#a89b82",
            fontSize: 10,
          }}>{m.up === true ? "▲" : m.up === false ? "▼" : "·"} {m.delta}</span>
        </div>
      ))}
    </div>
  );
}

function MainLeadCard({ outlet, onOpen, onExpand, expanded, rightBorder, topBorder }) {
  const ed = outlet.editorial;
  const isKo = outlet.lang === "ko";
  return (
    <article style={{
      padding: "36px 36px 32px",
      borderRight: rightBorder ? "1px solid #c9c0ad" : "none",
      borderTop: topBorder ? "1px solid #c9c0ad" : "none",
      display: "flex", flexDirection: "column", minHeight: 600,
    }}>
      <OutletHeader outlet={outlet} size="lg" />
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: outlet.leanColor,
        textTransform: "uppercase", letterSpacing: "0.2em",
        margin: "20px 0 8px", fontWeight: 600,
      }}>{ed.kicker}</div>
      <h2 onClick={onOpen} style={{
        fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
        fontSize: 40, lineHeight: 1.12, fontWeight: 800,
        letterSpacing: isKo ? "-0.035em" : "-0.02em",
        margin: "0 0 12px", cursor: "pointer", color: "#1a1713", textWrap: "pretty",
      }}
        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
      >{ed.title}</h2>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.15em",
        marginBottom: 18,
      }}>{ed.byline} · {ed.date}</div>
      <DailyTags outlet={outlet} />
      <div style={{ margin: "16px 0 20px", paddingLeft: 14, borderLeft: `3px solid ${outlet.leanColor}` }}>
        <div style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 9, color: "#7a7264",
          textTransform: "uppercase", letterSpacing: "0.15em",
          marginBottom: 8,
        }}>Editorial in three lines</div>
        {ed.summary.map((s, i) => (
          <div key={i} style={{
            fontSize: 14.5, lineHeight: 1.55, color: "#3a3428", marginBottom: 5,
            fontFamily: isKo ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
          }}>— {s}</div>
        ))}
      </div>
      <div style={{
        columnCount: 2, columnGap: 24,
        fontFamily: isKo ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
        fontSize: 14, lineHeight: 1.7, color: "#27231c", marginBottom: 16,
      }}>
        <p style={{ margin: 0, textWrap: "pretty" }}>
          <span style={{
            float: "left",
            fontFamily: `'Playfair Display', 'Noto Serif KR', serif`,
            fontSize: 56, lineHeight: 0.85, fontWeight: 900,
            paddingRight: 8, paddingTop: 4, color: outlet.leanColor,
          }}>{ed.body.charAt(0)}</span>
          {(expanded ? ed.body.slice(1) : ed.body.slice(1, 380) + "…")}
        </p>
      </div>
      {ed.pullQuote && (
        <blockquote style={{
          margin: "0 0 20px", padding: "14px 16px 14px 20px",
          borderLeft: `4px solid #1a1713`, background: "#ebe4d2",
          fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
          fontStyle: isKo ? "normal" : "italic",
          fontSize: 18, lineHeight: 1.35, fontWeight: 600, color: "#1a1713",
          letterSpacing: isKo ? "-0.02em" : "0",
        }}>"{ed.pullQuote}"</blockquote>
      )}
      <CardActions outlet={outlet} onOpen={onOpen} onExpand={onExpand} expanded={expanded} />
      <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "2px solid #1a1713" }}>
        <Top3 outlet={outlet} />
      </div>
    </article>
  );
}

function BottomStandardCard({ outlet, onOpen, rightBorder }) {
  const ed = outlet.editorial;
  const isKo = outlet.lang === "ko";
  return (
    <article style={{
      padding: "22px 20px 22px",
      borderRight: rightBorder ? "1px solid #c9c0ad" : "none",
      display: "flex", flexDirection: "column", minHeight: 420,
    }}>
      <OutletHeader outlet={outlet} size="sm" />
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 9, color: outlet.leanColor,
        textTransform: "uppercase", letterSpacing: "0.18em",
        margin: "14px 0 6px", fontWeight: 600,
      }}>{ed.kicker}</div>
      <h3 onClick={onOpen} style={{
        fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
        fontSize: 20, lineHeight: 1.2, fontWeight: 700,
        letterSpacing: isKo ? "-0.025em" : "-0.01em",
        margin: "0 0 10px", cursor: "pointer", color: "#1a1713",
      }}>{ed.title}</h3>
      <DailyTags outlet={outlet} tight />
      <p style={{
        fontFamily: isKo ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
        fontSize: 12.5, lineHeight: 1.55, color: "#3a3428",
        margin: "12px 0 14px",
      }}>{ed.summary[0]}</p>
      <CardActions outlet={outlet} onOpen={onOpen} tight />
      <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px dotted #c9c0ad" }}>
        <Top3 outlet={outlet} compact />
      </div>
    </article>
  );
}

function CrossCompare({ byId, onOpenReader }) {
  const cc = window.CROSS_COMPARE[0];
  if (!cc) return null;
  const outlets = cc.outletIds.map(id => byId[id]).filter(Boolean);
  if (outlets.length < 2) return null;
  return (
    <section style={{
      margin: "24px 56px 24px", padding: "28px 0",
      borderTop: "3px double #1a1713", borderBottom: "3px double #1a1713",
      background: "#faf6ec",
    }}>
      <div style={{ padding: "0 28px", marginBottom: 20 }}>
        <div style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 10, color: "#7a7264",
          textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 6,
        }}>Cross Compare · 같은 이슈, 다른 관점</div>
        <h3 style={{
          fontFamily: `'Playfair Display', serif`,
          fontSize: 30, fontWeight: 800, fontStyle: "italic",
          letterSpacing: "-0.02em", margin: 0,
        }}>On "{cc.label}"</h3>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${outlets.length}, 1fr)`,
        gap: 0, padding: "0 28px",
      }}>
        {outlets.map((o, i) => {
          const ed = o.editorial;
          const isKo = o.lang === "ko";
          return (
            <div key={o.id} style={{
              padding: "0 24px",
              borderLeft: i > 0 ? "1px solid #c9c0ad" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <window.OutletLogo outlet={o} size={26} />
                <div style={{
                  fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
                  fontSize: 14, fontWeight: 700,
                }}>{o.name}</div>
                <window.LeanBadge outlet={o} showEn={!isKo} />
              </div>
              <div style={{
                fontFamily: `'IBM Plex Mono', monospace`,
                fontSize: 10, fontWeight: 600, color: o.leanColor,
                textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10,
              }}>Stance: {ed.stance}</div>
              <h4 onClick={() => onOpenReader(o)} style={{
                fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
                fontSize: 19, lineHeight: 1.25, fontWeight: 700,
                letterSpacing: isKo ? "-0.02em" : "-0.01em",
                margin: "0 0 12px", cursor: "pointer",
              }}>{ed.title}</h4>
              <blockquote style={{
                margin: 0,
                fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
                fontStyle: isKo ? "normal" : "italic",
                fontSize: 15, lineHeight: 1.4, fontWeight: 500, color: "#3a3428",
                paddingLeft: 14, borderLeft: `3px solid ${o.leanColor}`,
              }}>"{ed.pullQuote}"</blockquote>
              <div style={{ marginTop: 14, display: "flex", gap: 6 }}>
                <button onClick={() => onOpenReader(o)} style={miniBtn(true)}>
                  <window.TranslateIcon size={10} />{isKo ? "EN" : "한"}
                </button>
                <a href={o.editorialUrl} target="_blank" rel="noopener" style={miniBtn(false)}>
                  원문 <window.ExternalIcon size={10} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function miniBtn(primary) {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: `'IBM Plex Mono', monospace`,
    fontSize: 10, padding: "5px 10px",
    background: primary ? "#1a1713" : "transparent",
    color: primary ? "#f5efe2" : "#4a4237",
    border: `1px solid ${primary ? "#1a1713" : "#c9c0ad"}`,
    cursor: "pointer", textDecoration: "none",
    textTransform: "uppercase", letterSpacing: "0.08em",
  };
}

function OutletHeader({ outlet, size }) {
  const dims = size === "lg" ? { logo: 48, name: 20 } : { logo: 32, name: 14 };
  const isKo = outlet.lang === "ko";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <window.OutletLogo outlet={outlet} size={dims.logo} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={outlet.url} target="_blank" rel="noopener" style={{
          fontFamily: isKo ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
          fontSize: dims.name, fontWeight: 800,
          color: "#1a1713", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
          letterSpacing: isKo ? "-0.025em" : "-0.01em",
        }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
        >{outlet.name}<window.ExternalIcon size={11} /></a>
        <div style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 9, color: "#7a7264",
          textTransform: "uppercase", letterSpacing: "0.14em", marginTop: 2,
        }}>EST. {outlet.est} · {outlet.country} · {isKo ? "KOR" : "ENG"} · CIRC {outlet.circulation}</div>
      </div>
      <window.LeanBadge outlet={outlet} showEn={!isKo} />
    </div>
  );
}

function DailyTags({ outlet, tight }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      marginTop: tight ? 4 : 0,
    }}>
      <span style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 9, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.15em",
        marginRight: 2, alignSelf: "center",
      }}>Today:</span>
      {outlet.editorial.tags.map(t => (
        <span key={t} style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 10, padding: "2px 7px",
          color: outlet.leanColor,
          border: `1px solid ${outlet.leanColor}55`,
          letterSpacing: "0.03em",
        }}>{t}</span>
      ))}
    </div>
  );
}

function CardActions({ outlet, onOpen, onExpand, expanded, tight }) {
  const isKo = outlet.lang === "ko";
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: tight ? 0 : 4 }}>
      <button onClick={onOpen} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, padding: "6px 10px",
        background: "#1a1713", color: "#f5efe2",
        border: "1px solid #1a1713", cursor: "pointer",
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        <window.TranslateIcon size={11} />
        {isKo ? "번역 / EN" : "번역 / KO"}
      </button>
      {onExpand && (
        <button onClick={onExpand} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 10, padding: "6px 10px",
          background: "transparent", color: "#1a1713",
          border: "1px solid #1a1713", cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>{expanded ? "Collapse" : "Read more"}</button>
      )}
      <a href={outlet.editorialUrl} target="_blank" rel="noopener" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, padding: "6px 10px",
        background: "transparent", color: "#4a4237",
        border: "1px solid #c9c0ad", textDecoration: "none",
        textTransform: "uppercase", letterSpacing: "0.1em",
      }} onClick={e => e.stopPropagation()}>
        원문 <window.ExternalIcon size={10} />
      </a>
    </div>
  );
}

function Top3({ outlet, compact }) {
  const isKo = outlet.lang === "ko";
  return (
    <div>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 9, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.15em",
        marginBottom: 8,
        display: "flex", justifyContent: "space-between",
      }}>
        <span>Top 3 · {outlet.editorial.date}</span>
        <span style={{ color: outlet.leanColor }}>●●●</span>
      </div>
      <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
        {outlet.top3.map((t, i) => (
          <li key={i} style={{
            display: "grid", gridTemplateColumns: "20px 1fr", gap: 8,
            fontSize: compact ? 12 : 13.5, lineHeight: 1.4,
            padding: compact ? "7px 0" : "8px 0",
            borderBottom: i < 2 ? "1px dotted #d9d1bd" : "none",
            fontFamily: isKo ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
            color: "#27231c",
          }}>
            <span style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 10, color: outlet.leanColor, fontWeight: 700, paddingTop: 2,
            }}>0{i + 1}</span>
            <a href={outlet.url} target="_blank" rel="noopener"
              style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
            >{t}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionHeader({ kicker, title, count }) {
  return (
    <div style={{
      padding: "28px 0 16px",
      display: "flex", alignItems: "baseline", justifyContent: "space-between",
    }}>
      <div>
        <div style={{
          fontFamily: `'IBM Plex Mono', monospace`,
          fontSize: 10, color: "#7a7264",
          textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 4,
        }}>{kicker}</div>
        <h3 style={{
          fontFamily: `'Playfair Display', serif`,
          fontSize: 30, fontWeight: 800, fontStyle: "italic",
          letterSpacing: "-0.02em", margin: 0,
        }}>{title}</h3>
      </div>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 10, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.15em",
      }}>{count} outlets</div>
    </div>
  );
}

function Colophon() {
  return (
    <footer style={{
      padding: "28px 56px 40px",
      borderTop: "3px double #1a1713",
      background: "#ebe4d2", textAlign: "center",
      fontFamily: `'IBM Plex Mono', monospace`,
      fontSize: 10, color: "#7a7264",
      textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 2,
    }}>
      <div style={{
        fontFamily: `'Playfair Display', serif`,
        fontSize: 14, color: "#1a1713", fontStyle: "italic",
        textTransform: "none", letterSpacing: 0, marginBottom: 6,
      }}>— Compiled daily at 06:00 Korea Standard Time —</div>
      <div>Saseol · Vol. I · No. 108 · {window.CRAWL_META.outletCount} outlets · 4 korean · 4 english</div>
      <div>Next sync · tomorrow 06:00 KST · all rights reserved by their respective publishers</div>
    </footer>
  );
}

window.OptionABroadsheet = OptionABroadsheet;
