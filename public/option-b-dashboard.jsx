// Option B: Editorial Dashboard — sidebar + focused main + compact strip.
// Bloomberg-terminal-ish density, but softened with journalism-style typography.

const { useState: useStateB, useMemo: useMemoB } = React;

function OptionBDashboard() {
  const outlets = window.OUTLETS;
  const [selectedId, setSelectedId] = useStateB(outlets[0].id);
  const [langFilter, setLangFilter] = useStateB("all"); // all | ko | en
  const [readerOutlet, setReaderOutlet] = useStateB(null);

  const filtered = useMemoB(() =>
    langFilter === "all" ? outlets : outlets.filter(o => o.lang === langFilter),
  [langFilter]);

  const selected = outlets.find(o => o.id === selectedId) || outlets[0];
  const others = outlets.filter(o => o.id !== selectedId);

  return (
    <div style={{
      background: "#1a1713",
      color: "#ebe4d2",
      minHeight: "100%",
      display: "grid",
      gridTemplateColumns: "260px 1fr",
      fontFamily: `'IBM Plex Sans', 'Noto Sans KR', sans-serif`,
    }}>
      {/* Sidebar */}
      <aside style={{
        borderRight: "1px solid #2e2a22",
        background: "#141110",
        padding: "24px 0",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid #2e2a22" }}>
          <div style={{
            fontFamily: `'Playfair Display', 'Noto Serif KR', serif`,
            fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em",
          }}>사설 <span style={{ fontStyle: "italic", fontWeight: 400, opacity: 0.5 }}>Desk</span></div>
          <div style={{
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: 9, color: "#7a7264",
            textTransform: "uppercase", letterSpacing: "0.15em",
            marginTop: 4,
          }}>Editorial Terminal · v1.0</div>
        </div>

        {/* Language filter */}
        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: 9, color: "#7a7264",
            textTransform: "uppercase", letterSpacing: "0.15em",
            marginBottom: 8,
          }}>Language</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["all", "All"], ["ko", "한"], ["en", "EN"]].map(([k, l]) => (
              <button key={k} onClick={() => setLangFilter(k)}
                style={{
                  flex: 1, padding: "6px 0",
                  fontFamily: `'IBM Plex Mono', monospace`,
                  fontSize: 10,
                  background: langFilter === k ? "#ebe4d2" : "transparent",
                  color: langFilter === k ? "#141110" : "#ebe4d2",
                  border: "1px solid " + (langFilter === k ? "#ebe4d2" : "#3a352b"),
                  cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Outlet list */}
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: 9, color: "#7a7264",
            textTransform: "uppercase", letterSpacing: "0.15em",
            marginBottom: 8,
          }}>Outlets · {filtered.length}</div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.map(o => {
            const active = o.id === selectedId;
            return (
              <button key={o.id} onClick={() => setSelectedId(o.id)}
                style={{
                  width: "100%", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 20px",
                  background: active ? "#2a241c" : "transparent",
                  borderLeft: "3px solid " + (active ? o.leanColor : "transparent"),
                  border: "none",
                  borderBottom: "1px solid #2a261f",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <window.OutletLogo outlet={o} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: o.lang === "ko" ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
                    fontSize: 13, fontWeight: 600,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{o.name}</div>
                  <div style={{
                    fontFamily: `'IBM Plex Mono', monospace`,
                    fontSize: 9, color: "#7a7264",
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    marginTop: 1,
                  }}>{o.country} · {o.lang.toUpperCase()} · {o.leanEn}</div>
                </div>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: o.leanColor, flexShrink: 0,
                }} />
              </button>
            );
          })}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #2e2a22", fontSize: 10 }}>
          <DashStatus />
        </div>
      </aside>

      {/* Main */}
      <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid #2e2a22",
          background: "#141110",
        }}>
          <div style={{
            display: "flex", gap: 24,
            fontFamily: `'IBM Plex Mono', monospace`,
            fontSize: 10, color: "#7a7264",
            textTransform: "uppercase", letterSpacing: "0.15em",
          }}>
            <span>SAT · APR 18 · 2026</span>
            <span>KST 14:22</span>
            <span style={{ color: "#3a9a5a" }}>● LIVE</span>
          </div>
          <div>
            <window.CrawlStatus compact />
          </div>
        </div>

        {/* Focus panel */}
        <section style={{
          padding: "36px 48px 28px",
          borderBottom: "1px solid #2e2a22",
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 40,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <window.OutletLogo outlet={selected} size={44} />
              <div>
                <a href={selected.url} target="_blank" rel="noopener"
                  style={{
                    fontFamily: selected.lang === "ko" ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
                    fontSize: 22, fontWeight: 700, color: "#ebe4d2",
                    textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
                  }}
                >{selected.name} <window.ExternalIcon size={13} /></a>
                <div style={{
                  fontFamily: `'IBM Plex Mono', monospace`,
                  fontSize: 10, color: "#7a7264",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  marginTop: 2,
                  display: "flex", gap: 10, alignItems: "center",
                }}>
                  <span>EDITORIAL · {selected.editorial.date}</span>
                  <window.LeanBadge outlet={selected} showEn={selected.lang !== "ko"} />
                </div>
              </div>
            </div>

            <h2 style={{
              fontFamily: selected.lang === "ko" ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
              fontSize: 36, lineHeight: 1.2, fontWeight: 700,
              letterSpacing: selected.lang === "ko" ? "-0.03em" : "-0.015em",
              margin: "0 0 20px", color: "#fbf8f1",
            }}>{selected.editorial.title}</h2>

            <div style={{
              padding: "16px 20px",
              background: "#22201b",
              borderLeft: "3px solid " + selected.leanColor,
              marginBottom: 20,
            }}>
              <div style={{
                fontFamily: `'IBM Plex Mono', monospace`,
                fontSize: 9, color: "#7a7264",
                textTransform: "uppercase", letterSpacing: "0.15em",
                marginBottom: 10,
              }}>3-Line Summary · AI-generated</div>
              {selected.editorial.summary.map((s, i) => (
                <div key={i} style={{
                  fontFamily: selected.lang === "ko" ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
                  fontSize: 14, lineHeight: 1.6, color: "#ebe4d2",
                  marginBottom: 4,
                }}>— {s}</div>
              ))}
            </div>

            <p style={{
              fontFamily: selected.lang === "ko" ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
              fontSize: 15, lineHeight: 1.7, color: "#cac2af",
              margin: "0 0 24px",
            }}>{selected.editorial.body}</p>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setReaderOutlet(selected)} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: `'IBM Plex Mono', monospace`,
                fontSize: 11,
                padding: "10px 16px",
                background: "#ebe4d2",
                color: "#141110",
                border: "none", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.1em",
                fontWeight: 600,
              }}>
                <window.TranslateIcon size={13} />
                {selected.lang === "ko" ? "Translate to English" : "한국어로 번역"}
              </button>
              <a href={selected.editorialUrl} target="_blank" rel="noopener" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: `'IBM Plex Mono', monospace`,
                fontSize: 11,
                padding: "10px 16px",
                background: "transparent",
                color: "#ebe4d2",
                border: "1px solid #3a352b",
                textDecoration: "none",
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                원문 사이트 <window.ExternalIcon size={12} />
              </a>
            </div>
          </div>

          {/* Top 3 sidebar */}
          <div>
            <div style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 10, color: "#7a7264",
              textTransform: "uppercase", letterSpacing: "0.15em",
              marginBottom: 16,
              paddingBottom: 10, borderBottom: "1px solid #2e2a22",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>Top 3 · {selected.name}</span>
              <span style={{ color: selected.leanColor }}>●●●</span>
            </div>
            {selected.top3.map((t, i) => (
              <a key={i} href={selected.url} target="_blank" rel="noopener" style={{
                display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 10,
                alignItems: "start",
                padding: "14px 0",
                borderBottom: i < 2 ? "1px solid #2a261f" : "none",
                textDecoration: "none", color: "inherit",
              }}>
                <span style={{
                  fontFamily: `'IBM Plex Mono', monospace`,
                  fontSize: 18, fontWeight: 700,
                  color: selected.leanColor,
                  lineHeight: 1,
                }}>0{i + 1}</span>
                <span style={{
                  fontFamily: selected.lang === "ko" ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
                  fontSize: 14, lineHeight: 1.45,
                  color: "#ebe4d2",
                }}>{t}</span>
                <window.ExternalIcon size={11} />
              </a>
            ))}
          </div>
        </section>

        {/* Other outlets strip */}
        <section style={{ padding: "28px 48px 48px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 18,
          }}>
            <div style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 11, color: "#7a7264",
              textTransform: "uppercase", letterSpacing: "0.15em",
            }}>Also on the desk · {others.length} outlets</div>
            <div style={{
              fontFamily: `'IBM Plex Mono', monospace`,
              fontSize: 10, color: "#7a7264",
            }}>click card to switch focus</div>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}>
            {others.map(o => (
              <CompactOutletCard key={o.id} outlet={o} onSelect={() => setSelectedId(o.id)} onReader={() => setReaderOutlet(o)} />
            ))}
          </div>
        </section>
      </main>

      <window.TranslateReader outlet={readerOutlet} open={!!readerOutlet} onClose={() => setReaderOutlet(null)} />
    </div>
  );
}

function CompactOutletCard({ outlet, onSelect, onReader }) {
  return (
    <div onClick={onSelect} style={{
      background: "#22201b",
      border: "1px solid #2e2a22",
      padding: "14px 16px",
      cursor: "pointer",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#2a2620"}
      onMouseLeave={e => e.currentTarget.style.background = "#22201b"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <window.OutletLogo outlet={outlet} size={22} />
        <span style={{
          fontFamily: outlet.lang === "ko" ? `'Noto Serif KR', serif` : `'Playfair Display', serif`,
          fontSize: 12, fontWeight: 600,
          flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{outlet.name}</span>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: outlet.leanColor }} />
      </div>
      <div style={{
        fontFamily: outlet.lang === "ko" ? `'Noto Serif KR', serif` : `'Source Serif 4', serif`,
        fontSize: 13.5, lineHeight: 1.35, color: "#ebe4d2",
        fontWeight: 600,
        marginBottom: 10,
        display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>{outlet.editorial.title}</div>
      <div style={{
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 9, color: "#7a7264",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 8,
      }}>Top: {outlet.top3[0]}</div>
      <button onClick={e => { e.stopPropagation(); onReader(); }} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: `'IBM Plex Mono', monospace`,
        fontSize: 9,
        padding: "3px 7px",
        background: "transparent",
        color: "#ebe4d2",
        border: "1px solid #3a352b",
        cursor: "pointer",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        <window.TranslateIcon size={9} />
        {outlet.lang === "ko" ? "EN" : "한"}
      </button>
    </div>
  );
}

function DashStatus() {
  return (
    <div style={{
      fontFamily: `'IBM Plex Mono', monospace`,
      fontSize: 9, color: "#7a7264",
      textTransform: "uppercase", letterSpacing: "0.12em",
      lineHeight: 1.8,
    }}>
      <div style={{ color: "#3a9a5a" }}>● Synced</div>
      <div>Last: {window.CRAWL_META.lastSync}</div>
      <div style={{ opacity: 0.7 }}>Next: Tomorrow 06:00 KST</div>
    </div>
  );
}

window.OptionBDashboard = OptionBDashboard;
