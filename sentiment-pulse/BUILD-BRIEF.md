# BUILD BRIEF — MOODEX v0.1

**대상**: 코딩 에이전트 / 개발자 핸드오프
**작성일**: 2026-03-23
**목표 완료**: 1주 (5 영업일)

---

## 1. 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 프레임워크 | Next.js 15 (App Router) | SSR + API Routes 동시, Vercel 배포 최적 |
| 언어 | TypeScript strict | |
| 스타일 | Tailwind CSS v4 | |
| 차트 | Recharts | 가장 가볍고 Next.js 호환 안정적 |
| 상태관리 | Zustand v5 | 전역 score 캐시, Pro 상태 관리 |
| 이메일 | Resend API | 무료 플랜 3,000통/월, SDK 간단 |
| DB | Supabase (PostgreSQL) | 이메일 구독자 저장, 히스토리 캐시 |
| 결제 | Toss Payments (또는 Stripe fallback) | 국내 카드 최적, 테스트 모드 지원 |
| 배포 | Vercel | |
| Cron | Vercel Cron Jobs | 매일 09:00 KST 점수 업데이트 |

---

## 2. 외부 API 연동

### 2-1. alternative.me Crypto Fear & Greed
```
GET https://api.alternative.me/fng/?limit=90&format=json
응답: { data: [{ value: "52", value_classification: "Neutral", timestamp: "..." }] }
```
- API 키 불필요
- 일별 데이터, 최대 `limit` 파라미터로 히스토리 가져오기

### 2-2. Yahoo Finance (VIX)
```
# Python 또는 Next.js API Route에서 yfinance 호출 또는 Yahoo Finance v8 비공개 API
GET https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=90d
응답: chart.result[0].indicators.quote[0].close[]
```
- API 키 불필요 (비공개 endpoint, 변경 가능성 있음)
- **대안**: Alpha Vantage 무료 플랜 (5req/min, 500req/day)

### 2-3. MOODEX Score 계산 (서버사이드)
```typescript
function calcMoodexScore(cryptoFG: number, vix: number): number {
  const vixNorm = Math.min(Math.max((vix - 10) / (80 - 10) * 100, 0), 100);
  return Math.round(cryptoFG * 0.5 + (100 - vixNorm) * 0.5);
}

function getRegime(score: number): Regime {
  if (score <= 24) return 'extreme_fear';
  if (score <= 44) return 'fear';
  if (score <= 55) return 'neutral';
  if (score <= 74) return 'greed';
  return 'extreme_greed';
}
```

---

## 3. 데이터베이스 스키마 (Supabase)

```sql
-- 일별 MOODEX Score 캐시
CREATE TABLE daily_scores (
  date         DATE PRIMARY KEY,
  moodex_score INTEGER NOT NULL,
  crypto_fg    INTEGER NOT NULL,
  vix          DECIMAL(6,2) NOT NULL,
  regime       TEXT NOT NULL,  -- extreme_fear|fear|neutral|greed|extreme_greed
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 이메일 구독자
CREATE TABLE subscribers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  plan         TEXT DEFAULT 'free',  -- free|pro
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN DEFAULT TRUE
);
```

---

## 4. API Routes

| Route | Method | 설명 |
|-------|--------|------|
| `/api/score` | GET | 오늘 + 어제 MOODEX Score 반환 |
| `/api/history?days=30` | GET | 최근 N일 히스토리 배열 반환 |
| `/api/subscribe` | POST | 이메일 구독 등록 |
| `/api/cron/update-score` | GET | Vercel Cron 트리거 (매일 09:00 KST) |

### `/api/score` 응답 형태
```typescript
{
  date: "2026-03-23",
  score: 47,
  regime: "neutral",
  label: "중립",
  interpretation: "시장은 현재 방향성을 탐색 중입니다. 극단적 신호 없음.",
  components: {
    cryptoFG: 52,
    vix: 18.3
  },
  change: +2  // 전일 대비
}
```

### `/api/history?days=30` 응답 형태
```typescript
{
  data: [
    { date: "2026-03-23", score: 47, regime: "neutral" },
    { date: "2026-03-22", score: 45, regime: "neutral" },
    ...
  ]
}
```

---

## 5. 컴포넌트 구현 명세

### `ScoreHero`
- Props: `score: number`, `regime: Regime`, `interpretation: string`, `change: number`
- 게이지: CSS 그라디언트 (빨강 → 노랑 → 초록), 마커 위치 = `score%`
- 레짐별 배경색: `extreme_fear`=#FEE2E2, `fear`=#FED7AA, `neutral`=#F3F4F6, `greed`=#D1FAE5, `extreme_greed`=#A7F3D0
- 점수 변화: `change > 0` → 초록 화살표, `< 0` → 빨강

### `SparklineChart`
- Library: `recharts` LineChart
- 7일 데이터, 점 표시 없음, 영역 채우기 (반투명)
- 클릭 시 `/history` 이동

### `RegimeLineChart` (히스토리 페이지)
- `recharts` ComposedChart
- 배경: `ReferenceArea` 로 레짐 구간 색상 표시
- X축: 날짜 (MM/DD), Y축: 0–100
- Pro 잠금: 90일+ 데이터 반환 전 서버에서 plan 체크

### `AssetImplicationGrid`
- 레짐별 하드코딩 맵 (`assetImplications.ts`)
- 구조: `{ regime: Regime, asset: Asset, label: string, detail: string }`
- 예: `{ regime: 'extreme_fear', asset: 'kospi', label: '역발상 매수 고려', detail: '...' }`

### `AlertSubscribeCTA`
- 이메일 input + 구독 버튼
- POST `/api/subscribe`
- 성공: "구독 완료! 레짐 변화 시 이메일을 보내드립니다."
- 이미 구독: "이미 구독 중입니다."

---

## 6. 해석 텍스트 / 콘텐츠 (하드코딩 시작)

파일: `src/data/interpretations.ts`

```typescript
export const INTERPRETATIONS: Record<Regime, RegimeContent> = {
  extreme_fear: {
    label: "극단적 공포",
    color: "red",
    interpretation: "시장에 극단적 공포가 팽배합니다. 역사적으로 이 구간은 중장기 매수 기회였으나, 추가 하락 가능성도 존재합니다.",
    assetCards: {
      kospi: { label: "분할 매수 기회 탐색", detail: "극단적 공포 후 3개월 평균 수익률 +12%" },
      crypto: { label: "변동성 극대화 경계", detail: "단기 추가 하락 가능, 소규모 분할만" },
      us_stock: { label: "공포 매수 역사적 유효", detail: "S&P500 공포 저점 평균 반등 +18%" },
      cash_bond: { label: "현금 비중 확대 유효", detail: "방어적 자산 비중 확대 시기" }
    },
    guide: {
      conservative: "추가 매수 자제, 기존 포지션 유지. 현금 확보 우선.",
      neutral: "분할 매수 소액 시작 가능. 전체 포지션의 10–20%만.",
      aggressive: "적극적 저점 매수 기회. 단, 손절 기준 명확히 설정."
    }
  },
  // ... fear, neutral, greed, extreme_greed 동일 구조
};
```

---

## 7. Vercel Cron 설정

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-score",
      "schedule": "0 0 * * *"
    }
  ]
}
```
(UTC 00:00 = KST 09:00)

`/api/cron/update-score` 로직:
1. alternative.me API → 오늘 Crypto F&G
2. Yahoo Finance API → 오늘 VIX 종가
3. MOODEX Score 계산
4. Supabase `daily_scores` UPSERT
5. 레짐 변화 감지 → 변화 있으면 Resend로 구독자 이메일 발송

---

## 8. 이메일 알림 (Resend)

발송 조건: 전일 대비 레짐 변화 발생 시

이메일 템플릿 구조:
```
제목: [MOODEX] 시장심리가 '{이전 레짐}'에서 '{현재 레짐}'으로 변했습니다

본문:
- 오늘 MOODEX Score: 47 (중립)
- 어제: 31 (공포) → 오늘: 47 (중립)
- 해석: ...
- [대시보드 보기] 버튼
```

---

## 9. Pro 접근 제어

MVP 단순화: **쿠키 기반 (결제 완료 시 `pro_token` 쿠키 설정)**

```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const proToken = req.cookies.get('pro_token');
  // /api/history?days=90 이상 요청 시 토큰 검증
}
```

결제 연동 전까지: Toss Payments Sandbox 모드로 플로우만 구현.
실제 결제 → Phase 2에서 Webhook 처리.

---

## 10. 폴더 구조

```
sentiment-pulse/          (← 이 빌드 브리프의 루트)
src/
├── app/
│   ├── dashboard/page.tsx
│   ├── history/page.tsx
│   ├── guide/page.tsx
│   ├── subscribe/page.tsx
│   └── api/
│       ├── score/route.ts
│       ├── history/route.ts
│       ├── subscribe/route.ts
│       └── cron/update-score/route.ts
├── components/
│   ├── ScoreHero.tsx
│   ├── ComponentMini.tsx
│   ├── SparklineChart.tsx
│   ├── RegimeLineChart.tsx
│   ├── AssetImplicationGrid.tsx
│   ├── QuickGuide.tsx
│   └── AlertSubscribeCTA.tsx
├── data/
│   └── interpretations.ts
├── lib/
│   ├── moodexScore.ts       ← 점수 계산 로직
│   ├── fetchCryptoFG.ts     ← alternative.me 연동
│   ├── fetchVIX.ts          ← Yahoo Finance 연동
│   ├── supabase.ts          ← Supabase 클라이언트
│   └── resend.ts            ← Resend 이메일
├── types/
│   └── score.ts             ← Regime, DailyScore, Subscriber 타입
└── vercel.json
```

---

## 11. 환경 변수

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
CRON_SECRET=                 # Vercel Cron 보안 토큰
ALPHA_VANTAGE_KEY=           # VIX 백업 소스
```

---

## 12. MVP 완료 기준 (Acceptance Criteria)

- [ ] `/dashboard` 페이지에서 오늘 MOODEX Score + 해석 텍스트 표시
- [ ] 7일 스파크라인 차트 렌더링
- [ ] 자산 카드 4개 레짐에 맞게 표시
- [ ] 이메일 구독 폼 → Supabase 저장 → 확인 메시지
- [ ] `/history` 30일 차트 무료, 90일 잠금 오버레이 표시
- [ ] `/guide` 레짐별 대응 가이드 5개 탭 작동
- [ ] Vercel Cron 매일 실행, Supabase 업데이트 확인
- [ ] 레짐 변화 시 구독자 이메일 발송 확인 (Resend 로그)
- [ ] 모바일(375px) 레이아웃 깨짐 없음
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] Vercel 배포 성공

---

## 13. 개발 순서 (권장)

**Day 1**: 스택 셋업 + Supabase 스키마 + API 연동 확인 (`fetchCryptoFG`, `fetchVIX`)
**Day 2**: Score 계산 로직 + `/api/score` + `/api/history` 구현
**Day 3**: `ScoreHero`, `SparklineChart`, `AssetImplicationGrid` 컴포넌트
**Day 4**: 히스토리 페이지 + 대응 가이드 페이지 + 이메일 구독
**Day 5**: Vercel Cron + Resend 알림 + Pro 잠금 UI + 배포 + 모바일 QA
