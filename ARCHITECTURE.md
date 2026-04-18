# Editorial Desk — Crawler Architecture

> 매일 06:00 KST에 8개 매체 사설을 수집해 `data.js`를 갱신하고 Pages로 배포하는 정적 파이프라인.

## 레포 구조

```
editorial-desk/
├── .github/
│   └── workflows/
│       └── daily-crawl.yml        # cron: 0 21 * * *  (UTC = 06:00 KST)
├── crawler/
│   ├── package.json
│   ├── crawl.js                   # 엔트리. 병렬 실행 + data.js 쓰기
│   ├── lib/
│   │   ├── fetch.js               # UA/타임아웃/재시도 래퍼
│   │   ├── extract.js             # 드롭캡/요약/태그 보조 유틸
│   │   └── llm.js                 # (선택) 요약·태그 생성용 LLM 호출
│   ├── parsers/
│   │   ├── chosun.js              # 각 매체별 파서 — export default async (ctx) => partialOutlet
│   │   ├── wsj.js                 # 유료: meta og:title + og:description만 추출
│   │   ├── hankook.js
│   │   ├── koreatimes.js
│   │   ├── joongang.js
│   │   ├── heraldcorp.js
│   │   ├── nyt.js                 # 유료
│   │   └── ft.js                  # 유료
│   ├── outlets.config.js          # name/lean/leanColor/est/circulation 등 고정 메타
│   └── archive/
│       └── 2026-04-18.json        # (선택) 일자별 스냅샷 백업
├── public/
│   ├── index.html                 # Editorial Desk.html 리네임
│   ├── data.js                    # 크롤러가 매일 덮어쓰는 산출물
│   ├── option-a-broadsheet.jsx
│   ├── option-b-dashboard.jsx
│   ├── option-c-reading-room.jsx
│   └── shared.jsx
└── README.md
```

## 데이터 플로우

```
  outlets.config.js  ─┐
                      ├─► crawl.js ─► parsers/*.js ─► fetch + parse HTML
  parsers/<id>.js   ──┘                           │
                                                  ▼
                                    { editorial, top3 } partial
                                                  │
                                                  ▼
                                    merge(fixedMeta, partial)
                                                  │
                                                  ▼
                                    (선택) llm.js로 summary[3] / tags 보강
                                                  │
                                                  ▼
                                    write public/data.js  (window.OUTLETS = [...])
                                                  │
                                                  ▼
                                    git commit + push (Actions bot)
                                                  │
                                                  ▼
                                    Pages 자동 배포
```

## 매체별 파싱 전략

| 매체 | 접근성 | 1차 전략 | 폴백 |
|---|---|---|---|
| 조선일보 | 공개 | `og:title` + 본문 `<article>` 텍스트 추출 | 요약은 LLM |
| 한국일보 | 공개 | 사설 섹션 목록 → 최신 1건 링크 → 본문 | — |
| 중앙일보 | 공개 | 오피니언 → 사설 카테고리 필터 | — |
| 코리아헤럴드 | 공개 | 카테고리 페이지 첫 기사 | — |
| Korea Times | 공개 | editorial.html 최상단 | — |
| **WSJ** | 유료 | **og:title / og:description** 만 추출, `gated: true` 플래그 | 본문 본문 대신 placeholder |
| **NYT** | 유료 | 동일 — 메타태그 + 첫 문단만 | RSS 대안 검토 |
| **FT** | 유료 | 동일 | RSS |

> 유료 매체는 본문 전체를 **절대 재게시하지 않음**. 프런트엔드에서 `gated: true` 를 받으면 "구독 필요 — 원문 읽기" 카드로 대체 렌더.

## 공통 파서 시그니처

```js
// parsers/chosun.js
export default async function parse({ fetch, cheerio, outletMeta }) {
  const html = await fetch(outletMeta.editorialUrl);
  const $ = cheerio.load(html);
  const link = $(".editorial-list a").first().attr("href");
  const articleHtml = await fetch(link);
  const $$ = cheerio.load(articleHtml);
  const title = $$("meta[property='og:title']").attr("content");
  const body  = $$("article p").map((_, el) => $$(el).text()).get().join(" ");
  return {
    editorial: {
      title,
      kicker: null,
      byline: "사설",
      body,
      date: new Date().toISOString().slice(0, 10),
      sourceUrl: link,
      gated: false,
    },
  };
}
```

## 실패 정책

- 개별 파서가 throw하면 해당 매체는 **전일 데이터 유지** (`prevData[id]` 재사용)
- 3일 연속 실패 시 Actions에서 이슈 자동 생성
- 최소 5개 매체 성공 시에만 commit

## 환경변수 (Actions Secrets)

- `ANTHROPIC_API_KEY` — 요약/태그 생성용 (선택)
- 그 외 없음. 크롤링은 인증 없이 수행.

## 법적 고려

- 사설 전문 저장·재게시 대신 **제목 + 3줄 요약 + 풀 쿼트 1개 + 원문 링크** 형태로 표시
- robots.txt 준수, 1req/sec rate limit
- 유료 매체는 메타데이터 + 원문 링크만
