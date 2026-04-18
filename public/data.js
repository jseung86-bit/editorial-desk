// Editorial data — 8 news outlets. Hybrid stance: fixed outlet lean + daily editorial tags.
// Sample data representing a scheduled 06:00 KST crawl.

window.OUTLETS = [
  {
    id: "chosun",
    name: "조선일보",
    nameEn: "The Chosun Ilbo",
    lang: "ko",
    country: "KR",
    url: "https://www.chosun.com",
    editorialUrl: "https://www.chosun.com/opinion/editorial/",
    lean: "보수",
    leanEn: "Conservative",
    leanColor: "#B8342B",
    est: 1920,
    circulation: "1.2M",
    editorial: {
      title: "AI 규제, 산업 경쟁력과 국민 안전의 균형점 찾아야",
      kicker: "AI 기본법안 국회 상정을 앞두고",
      byline: "사설 · 논설위원실",
      tags: ["#친산업", "#규제완화", "#AI경쟁력", "#한국형프레임"],
      topic: "AI_REGULATION",
      stance: "AI 산업 경쟁력 위축 우려",
      summary: [
        "정부의 새로운 AI 기본법안이 국회 상정을 앞두고 있다.",
        "과도한 사전 규제는 국내 AI 산업의 글로벌 경쟁력을 저해할 수 있다.",
        "안전 기준은 강화하되, 혁신을 가로막지 않는 정교한 입법이 필요하다."
      ],
      body: "정부가 발의한 인공지능 기본법안이 다음 달 국회 본회의 상정을 앞두고 있다. 법안은 고위험 AI에 대한 사전 영향평가와 사업자 등록 의무를 골자로 한다. 방향은 옳지만 구체적 시행령 수준에서 국내 스타트업에 과도한 부담이 되지 않도록 세심한 조율이 필요하다. 유럽연합의 AI법이 규제 모델의 하나로 참고되지만, 우리 산업의 현 단계와 글로벌 경쟁 구도를 감안한 한국형 프레임이 요구된다. 규제의 목적이 혁신의 제약이 아니라 안전한 산업 생태계 조성에 있다는 점이 분명해야 한다. 사전 등록 의무의 기준이 지나치게 낮게 설정될 경우, 초기 단계 스타트업의 진입 장벽이 되어 국내 생태계의 다양성을 훼손할 수 있다. 입법 과정에서 업계와의 충분한 협의, 그리고 EU·미국 사례에 대한 비판적 검토가 병행되어야 할 것이다.",
      pullQuote: "규제의 목적은 혁신의 제약이 아니라 안전한 산업 생태계 조성이다.",
      date: "2026-04-18"
    },
    top3: [
      "반도체 수출 3개월 연속 두 자릿수 증가",
      "서울 아파트값, 강남3구 중심 상승 전환",
      "尹 정부 임기 후반 인사 개편 시사"
    ]
  },
  {
    id: "wsj",
    name: "The Wall Street Journal",
    nameEn: "The Wall Street Journal",
    lang: "en",
    country: "US",
    url: "https://www.wsj.com",
    editorialUrl: "https://www.wsj.com/opinion",
    lean: "Conservative",
    leanEn: "Conservative",
    leanColor: "#0274B6",
    est: 1889,
    circulation: "2.8M",
    editorial: {
      title: "Tariffs are a tax, and households are paying it",
      kicker: "The consumer-price ledger",
      byline: "THE EDITORIAL BOARD",
      tags: ["#free-trade", "#anti-tariff", "#inflation", "#fed-watch"],
      topic: "TARIFFS",
      stance: "Pro-market, anti-tariff",
      summary: [
        "New duties on consumer electronics have lifted retail prices by an estimated 4% since January.",
        "Manufacturers report only modest reshoring, with most production shifting to third countries.",
        "The bill is arriving just as the Fed hopes to complete its disinflation campaign."
      ],
      body: "The administration frames tariffs as leverage, but leverage requires someone on the other end of the rope. Instead, importers have swallowed margin where they could and raised shelf prices where they could not. Studies from both the New York Fed and private forecasters now converge on a simple conclusion: American consumers, not foreign exporters, are bearing the cost. Congress should reassert its constitutional authority over trade. The longer these duties stand, the deeper they embed themselves into consumer expectations and wage demands, undoing the Fed's patient work. A narrow, sector-specific approach to genuine national-security concerns is defensible. Broad, blunt tariffs on consumer goods are not. They function as a consumption tax, regressive by construction, dressed up as industrial policy.",
      pullQuote: "Leverage requires someone on the other end of the rope.",
      date: "2026-04-18"
    },
    top3: [
      "Oil majors signal caution as demand forecast softens",
      "Private credit funds top $2 trillion in assets",
      "SEC chair outlines lighter crypto enforcement posture"
    ]
  },
  {
    id: "hankook",
    name: "한국일보",
    nameEn: "The Hankook Ilbo",
    lang: "ko",
    country: "KR",
    url: "https://www.hankookilbo.com",
    editorialUrl: "https://www.hankookilbo.com/Collection/7340",
    lean: "중도",
    leanEn: "Centrist",
    leanColor: "#4A6B52",
    est: 1954,
    circulation: "280K",
    editorial: {
      title: "기후위기 대응, 더 이상 미룰 수 없는 국가 의제",
      kicker: "2050 탄소중립과 현실의 간극",
      byline: "사설",
      tags: ["#기후위기", "#탄소중립", "#초당적협치", "#에너지전환"],
      topic: "CLIMATE",
      stance: "적극적 기후 대응, 초당적 거버넌스",
      summary: [
        "올봄 역대 최고 기온과 극심한 가뭄이 전국을 강타했다.",
        "탄소중립 이행 로드맵은 산업계 반발에 부딪혀 속도가 느리다.",
        "정파를 넘어선 기후 거버넌스 구축이 시급하다."
      ],
      body: "4월 들어 전국 평균 기온이 평년 대비 4도 이상 높게 유지되고 있다. 낙동강·섬진강 유역은 저수율이 30%대로 떨어지며 농업용수 확보에 비상이 걸렸다. 2050 탄소중립은 선언만으로는 도달할 수 없다. 에너지 전환, 산업구조 개편, 시민 참여를 아우르는 포괄적 전략이 다음 정부 임기 초반에 확정되어야 한다. 그러나 현실은 그 반대로 흐르고 있다. 주요 산업계는 비용 부담을 이유로 감축 로드맵의 완화를 요구하고, 여야는 기후 의제에서조차 진영 논리로 충돌한다. 피해는 이미 농어민과 취약계층이 먼저 떠안고 있다. 기후 문제는 다음 선거의 의제가 아니라, 다음 세대의 생존 조건임을 정치권이 인식해야 한다.",
      pullQuote: "기후 문제는 다음 선거의 의제가 아니라, 다음 세대의 생존 조건이다.",
      date: "2026-04-18"
    },
    top3: [
      "4월 평균기온 역대 최고…벚꽃 2주 빨리 져",
      "전기차 보조금 개편안 이달 말 발표",
      "청년 구직급여 수급자 20만 명 돌파"
    ]
  },
  {
    id: "koreatimes",
    name: "The Korea Times",
    nameEn: "The Korea Times",
    lang: "en",
    country: "KR",
    url: "https://www.koreatimes.co.kr",
    editorialUrl: "https://www.koreatimes.co.kr/www/opinion/editorial.html",
    lean: "Center",
    leanEn: "Center",
    leanColor: "#2E5C8A",
    est: 1950,
    circulation: "160K",
    editorial: {
      title: "Seoul's diplomatic balancing act in a fragmenting world",
      kicker: "Between Washington and Beijing",
      byline: "EDITORIAL",
      tags: ["#geopolitics", "#us-china", "#semiconductors", "#supply-chain"],
      topic: "GEOPOLITICS",
      stance: "Strategic clarity, pragmatic engagement",
      summary: [
        "Korea faces mounting pressure to clarify its stance between Washington and Beijing.",
        "Trade data shows growing dependence on non-China supply chains, yet exports to China remain vital.",
        "A values-based but pragmatic foreign policy framework is long overdue."
      ],
      body: "As US-China tensions harden into a durable rivalry, Korea's traditional hedging posture is becoming unsustainable. Seoul must articulate clear red lines on technology transfers, semiconductor cooperation, and supply chain resilience, while preserving channels for economic engagement with its largest trading partner. Ambiguity, once a strategic asset, now invites pressure from both sides. A values-based framework — anchored in democratic solidarity with allies but disciplined by economic realism — offers the most sustainable path. The alternative, reactive decisions made in response to each fresh episode of pressure, has already cost Korean firms billions in stranded investments and uncertain market access.",
      pullQuote: "Ambiguity, once a strategic asset, now invites pressure from both sides.",
      date: "2026-04-18"
    },
    top3: [
      "Samsung unveils 2nm chip roadmap at Silicon Valley forum",
      "Korean film sweeps top awards at Cannes sidebar",
      "BOK governor signals caution on further easing"
    ]
  },
  {
    id: "joongang",
    name: "중앙일보",
    nameEn: "The JoongAng",
    lang: "ko",
    country: "KR",
    url: "https://www.joongang.co.kr",
    editorialUrl: "https://www.joongang.co.kr/opinion",
    lean: "중도보수",
    leanEn: "Center-Right",
    leanColor: "#1F4B8E",
    est: 1965,
    circulation: "720K",
    editorial: {
      title: "기준금리 동결, 가계부채·물가 양면 고려한 신중한 선택",
      kicker: "금통위의 3.25% 동결",
      byline: "사설",
      tags: ["#통화정책", "#가계부채", "#정책공조", "#내수회복"],
      topic: "MONETARY_POLICY",
      stance: "신중한 동결 지지, 재정·통화 공조 촉구",
      summary: [
        "한국은행 금융통화위원회가 기준금리를 3.25%로 동결했다.",
        "미 연준의 금리 인하 속도와 원화 가치가 주요 변수로 꼽힌다.",
        "재정·통화 정책 공조를 통해 내수 회복의 마중물을 마련해야 한다."
      ],
      body: "금통위의 이번 동결 결정은 물가 안정 기조와 가계부채 리스크를 함께 저울질한 결과로 읽힌다. 다만 내수 부진이 장기화될 조짐을 보이는 만큼, 통화정책만으로는 돌파구를 찾기 어렵다. 재정당국과의 긴밀한 협조, 그리고 부동산 연착륙을 위한 정교한 미시 정책이 병행되어야 한다.",
      pullQuote: "통화정책만으로는 내수 부진의 돌파구가 되지 않는다.",
      date: "2026-04-18"
    },
    top3: [
      "코스피 2,800선 회복…외국인 5일 연속 순매수",
      "수도권 전세가율 1년 만에 반등",
      "한·일 정상회담 5월 도쿄 개최 조율"
    ]
  },
  {
    id: "koreaherald",
    name: "The Korea Herald",
    nameEn: "The Korea Herald",
    lang: "en",
    country: "KR",
    url: "https://www.koreaherald.com",
    editorialUrl: "https://www.koreaherald.com/list.php?ct=020800000000",
    lean: "Center",
    leanEn: "Center",
    leanColor: "#0B5A4A",
    est: 1953,
    circulation: "180K",
    editorial: {
      title: "Pension reform cannot wait another election cycle",
      kicker: "NPS reserves on the clock",
      byline: "EDITORIAL",
      tags: ["#pension", "#demographics", "#fiscal", "#reform"],
      topic: "PENSION",
      stance: "Urgent structural reform required",
      summary: [
        "The National Pension Service reserves are now projected to deplete by 2055.",
        "Cross-party negotiations have stalled over contribution rates and payout formulas.",
        "Further delay shifts an unbearable burden onto younger generations."
      ],
      body: "Every year of inaction adds roughly 40 trillion won to the eventual cost of pension reform. The current framework, largely unchanged since 2007, assumes demographic conditions that no longer exist. Lawmakers must move past the politics of the next election and commit to a phased adjustment of contribution rates, retirement age, and benefit structures.",
      pullQuote: "Every year of inaction adds 40 trillion won to the cost.",
      date: "2026-04-18"
    },
    top3: [
      "Kospi closes above 2,800 for first time in six months",
      "Hyundai to invest $3bn in US EV battery plant",
      "Seoul, Tokyo agree on visa-free business travel expansion"
    ]
  },
  {
    id: "nyt",
    name: "The New York Times",
    nameEn: "The New York Times",
    lang: "en",
    country: "US",
    url: "https://www.nytimes.com",
    editorialUrl: "https://www.nytimes.com/section/opinion/editorials",
    lean: "Liberal",
    leanEn: "Liberal",
    leanColor: "#000000",
    est: 1851,
    circulation: "9.7M",
    editorial: {
      title: "The case for guardrails on generative AI in elections",
      kicker: "Synthetic media in 2026",
      byline: "THE EDITORIAL BOARD",
      tags: ["#ai-regulation", "#elections", "#disclosure", "#platform-accountability"],
      topic: "AI_REGULATION",
      stance: "Pro-regulation, transparency-first",
      summary: [
        "Synthetic media has moved from curiosity to campaign tool in a single cycle.",
        "Voluntary platform pledges have proven inconsistent and unevenly enforced.",
        "Targeted federal rules on provenance and disclosure are now essential."
      ],
      body: "In the final weeks of the last election, fabricated audio of a senator conceding before polls closed spread to millions before any correction reached voters. Platform self-regulation has failed to keep pace. Congress should pass narrow, technology-neutral rules requiring provenance metadata on paid political media and clear on-screen disclosures for synthetic content.",
      pullQuote: "Free speech is not at stake; transparency is.",
      date: "2026-04-18"
    },
    top3: [
      "Supreme Court weighs state authority on AI disclosure laws",
      "Climate migration reshapes Gulf Coast housing markets",
      "Fed minutes hint at divided path on rate cuts"
    ]
  },
  {
    id: "ft",
    name: "Financial Times",
    nameEn: "Financial Times",
    lang: "en",
    country: "UK",
    url: "https://www.ft.com",
    editorialUrl: "https://www.ft.com/opinion",
    lean: "Center",
    leanEn: "Market-Liberal",
    leanColor: "#E9A47B",
    est: 1888,
    circulation: "1.1M",
    editorial: {
      title: "Europe's competitiveness problem is a capital markets problem",
      kicker: "Draghi, eighteen months on",
      byline: "THE EDITORIAL BOARD",
      tags: ["#capital-markets", "#eu-integration", "#competitiveness", "#savings-union"],
      topic: "CAPITAL_MARKETS",
      stance: "Deeper EU market integration",
      summary: [
        "The Draghi report's diagnosis remains largely unimplemented eighteen months on.",
        "Fragmented capital markets continue to push Europe's best firms to list in New York.",
        "A genuine Savings and Investments Union should top the next Commission's agenda."
      ],
      body: "Europe does not lack savings. It lacks the plumbing to channel them into productive, scaled-up businesses. National champions are content protecting domestic turf while continental pools of capital sit in low-yielding instruments.",
      pullQuote: "Europe does not lack savings. It lacks the plumbing.",
      date: "2026-04-18"
    },
    top3: [
      "ECB signals patience on next rate move",
      "UK defence spending to breach 2.5% of GDP by 2027",
      "German industry warns on energy price gap with US"
    ]
  }
];

window.CROSS_COMPARE = [
  {
    topic: "AI_REGULATION",
    label: "AI 규제 · AI Regulation",
    outletIds: ["chosun", "nyt"]
  }
];

window.MARKET_STRIP = [
  { label: "KOSPI", value: "2,812.44", delta: "+0.82%", up: true },
  { label: "KOSDAQ", value: "862.11", delta: "+1.14%", up: true },
  { label: "USD/KRW", value: "1,362.20", delta: "-0.21%", up: false },
  { label: "S&P 500", value: "5,218.03", delta: "+0.34%", up: true },
  { label: "BRENT", value: "$82.14", delta: "-0.42%", up: false },
  { label: "SEOUL", value: "22°C", delta: "Clear", up: null },
  { label: "NEW YORK", value: "14°C", delta: "Overcast", up: null },
  { label: "LONDON", value: "11°C", delta: "Rain", up: null }
];

window.CRAWL_META = {
  lastSync: "2026-04-18 06:00 KST",
  schedule: "매일 06:00 KST / Daily 6:00 AM KST",
  outletCount: 8,
  status: "synced"
};
