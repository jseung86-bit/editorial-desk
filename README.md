# Editorial Desk

8개 주요 매체(조선·중앙·한국일보·코리아헤럴드·코리아타임스·WSJ·NYT·FT)의 당일 사설을 매일 06:00 KST에 수집·요약하여 신문 스타일 대시보드로 보여주는 정적 사이트.

## 구성

- **`public/`** — 정적 사이트 (GitHub Pages 퍼블리시 루트)
  - `index.html` (현재 `Editorial Desk.html`) — 3개 레이아웃 옵션 탭
  - `data.js` — 크롤러가 매일 덮어쓰는 `window.OUTLETS = [...]`
  - `option-a-broadsheet.jsx`, `option-b-dashboard.jsx`, `option-c-reading-room.jsx`
  - `shared.jsx`
- **`crawler/`** — Node 20 크롤러
  - `crawl.js` 엔트리, `parsers/<id>.js` 매체별 파서 8개
  - `lib/fetch.js` 폴라이트 fetch · `lib/extract.js` 파싱 유틸 · `lib/llm.js` (선택) 요약
  - `outlets.config.js` 매체 고정 메타 (이름·성향·창간년 등)
  - `archive/YYYY-MM-DD.json` 일자별 스냅샷
- **`.github/workflows/daily-crawl.yml`** — 매일 21:00 UTC(06:00 KST) cron

## 로컬 실행

```bash
cd crawler
npm install
node crawl.js --dry-run            # 전체 드라이런
node crawl.js --only chosun        # 한 매체만
node crawl.js                       # 실제 public/data.js 갱신
```

LLM 요약/태그를 쓰려면 `ANTHROPIC_API_KEY` 환경변수 설정. 없으면 본문 앞 3문장으로 자동 대체.

## 유료 매체 정책

WSJ·NYT·FT는 `gated: true` 플래그로 표시되며 **본문 전체를 저장·재게시하지 않습니다.** `og:title`, `og:description`, RSS 요약문, 원문 URL만 보관합니다. 프런트엔드는 해당 카드에 "구독 필요 — 원문 읽기" 링크를 렌더합니다.

## 배포

기본값은 GitHub Pages. 워크플로우의 `deploy` 잡을 제거하고 `public/`을 Netlify/Vercel/Cloudflare Pages에 연결해도 됩니다.

## 실패 시 동작

- 개별 파서 실패 → 해당 매체는 **전일 스냅샷 유지** (`_stale: true` 플래그)
- 신규 성공 매체가 5개 미만 → `data.js` 쓰기 중단, 워크플로우 실패
- 변경 없으면 커밋 안 함 (`git diff --quiet`)

## 선택자 유지보수

매체 HTML 마크업이 바뀌면 `parsers/<id>.js` 의 CSS 선택자를 업데이트. 파서 시그니처는 모두 동일:

```js
export default async function parse({ outletMeta }) {
  return { editorial: { title, body, pullQuote, date, sourceUrl, gated }, top3: [...] };
}
```

## 저작권·윤리

- 제목 + 3줄 요약 + 1개 풀쿼트 + 원문 링크 형태로만 저장
- `User-Agent`에 봇 식별 + robots.txt 준수, 호스트별 1 req/sec 스로틀
- 유료 매체는 메타데이터·링크만
