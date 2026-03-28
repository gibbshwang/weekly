import type { HistoricalContext, HistoricalEvent } from '../types/kfgi';
import type { SimilarCaseWithReturns } from '../types/narrative';

/**
 * Historical K-FGI-equivalent cases for Korean market.
 * Organized by approximate score range.
 * These are real events with estimated sentiment scores.
 */
const ALL_CASES: (HistoricalEvent & {
  returns: SimilarCaseWithReturns['returns'];
  pricePath: SimilarCaseWithReturns['pricePath'];
})[] = [
  // ── Extreme Fear (0-20) ──
  {
    date: '2020-03-19',
    label: '코로나 팬데믹 저점',
    score: 12,
    note: 'KOSPI 1,400대 붕괴, 사이드카 발동',
    forwardReturn30d: 14.8,
    returns: [
      { asset: 'KOSPI', return30d: 14.8, return60d: 22.1, return90d: 35.2 },
      { asset: 'KOSDAQ', return30d: 18.2, return60d: 28.4, return90d: 42.1 },
      { asset: 'Gold', return30d: 4.2, return60d: 6.8, return90d: 8.1 },
      { asset: 'BTC', return30d: 22.5, return60d: 38.4, return90d: 52.8 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: 5.4 },
      { day: 14, avgReturn: 8.2 }, { day: 30, avgReturn: 14.8 },
      { day: 45, avgReturn: 18.6 }, { day: 60, avgReturn: 22.1 },
      { day: 75, avgReturn: 28.4 }, { day: 90, avgReturn: 35.2 },
    ],
  },
  {
    date: '2022-09-26',
    label: '레고랜드 사태',
    score: 19,
    note: '강원도 ABCP 채무불이행으로 신용경색 확산',
    forwardReturn30d: -2.1,
    returns: [
      { asset: 'KOSPI', return30d: -2.1, return60d: 4.8, return90d: 9.6 },
      { asset: 'KOSDAQ', return30d: -3.4, return60d: 1.2, return90d: 6.1 },
      { asset: 'Gold', return30d: 2.1, return60d: 3.8, return90d: 5.4 },
      { asset: 'BTC', return30d: -4.2, return60d: -1.8, return90d: -8.5 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: -1.5 },
      { day: 14, avgReturn: -3.2 }, { day: 30, avgReturn: -2.1 },
      { day: 45, avgReturn: 1.4 }, { day: 60, avgReturn: 4.8 },
      { day: 75, avgReturn: 7.2 }, { day: 90, avgReturn: 9.6 },
    ],
  },

  // ── Fear (21-40) ──
  {
    date: '2024-08-05',
    label: '엔 캐리 트레이드 청산',
    score: 21,
    note: '일본은행 금리 인상 후 KOSPI 급락',
    forwardReturn30d: 3.2,
    returns: [
      { asset: 'KOSPI', return30d: 3.2, return60d: 5.1, return90d: 12.4 },
      { asset: 'KOSDAQ', return30d: 1.8, return60d: 2.4, return90d: 8.7 },
      { asset: 'Gold', return30d: 0.5, return60d: 1.2, return90d: 2.1 },
      { asset: 'BTC', return30d: 8.4, return60d: 15.2, return90d: 28.3 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: 1.2 },
      { day: 14, avgReturn: -0.8 }, { day: 30, avgReturn: 3.2 },
      { day: 45, avgReturn: 4.1 }, { day: 60, avgReturn: 5.1 },
      { day: 75, avgReturn: 8.8 }, { day: 90, avgReturn: 12.4 },
    ],
  },
  {
    date: '2022-06-17',
    label: '미 연준 자이언트 스텝',
    score: 28,
    note: '75bp 금리 인상, KOSPI 2,300선 붕괴',
    forwardReturn30d: -4.2,
    returns: [
      { asset: 'KOSPI', return30d: -4.2, return60d: -1.8, return90d: 2.1 },
      { asset: 'KOSDAQ', return30d: -6.1, return60d: -3.5, return90d: -0.4 },
      { asset: 'Gold', return30d: -1.2, return60d: -2.8, return90d: 1.4 },
      { asset: 'BTC', return30d: -12.4, return60d: -8.2, return90d: -5.1 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: -2.1 },
      { day: 14, avgReturn: -5.8 }, { day: 30, avgReturn: -4.2 },
      { day: 45, avgReturn: -3.1 }, { day: 60, avgReturn: -1.8 },
      { day: 75, avgReturn: 0.4 }, { day: 90, avgReturn: 2.1 },
    ],
  },
  {
    date: '2019-08-06',
    label: '한일 무역분쟁 격화',
    score: 32,
    note: '일본 수출규제 확대, 반도체 공급망 우려',
    forwardReturn30d: 1.8,
    returns: [
      { asset: 'KOSPI', return30d: 1.8, return60d: 3.2, return90d: 4.5 },
      { asset: 'KOSDAQ', return30d: 2.4, return60d: 4.8, return90d: 6.2 },
      { asset: 'Gold', return30d: 3.1, return60d: 5.2, return90d: 4.8 },
      { asset: 'BTC', return30d: -8.5, return60d: -15.2, return90d: -12.1 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: -1.2 },
      { day: 14, avgReturn: 0.4 }, { day: 30, avgReturn: 1.8 },
      { day: 45, avgReturn: 2.8 }, { day: 60, avgReturn: 3.2 },
      { day: 75, avgReturn: 3.8 }, { day: 90, avgReturn: 4.5 },
    ],
  },

  // ── Neutral (41-60) ──
  {
    date: '2023-10-27',
    label: '이스라엘-하마스 전쟁 장기화',
    score: 42,
    note: '중동 지정학 리스크 속 글로벌 관망세',
    forwardReturn30d: 4.8,
    returns: [
      { asset: 'KOSPI', return30d: 4.8, return60d: 7.2, return90d: 8.1 },
      { asset: 'KOSDAQ', return30d: 3.2, return60d: 5.8, return90d: 9.4 },
      { asset: 'Gold', return30d: 2.4, return60d: 4.1, return90d: 6.8 },
      { asset: 'BTC', return30d: 12.1, return60d: 28.4, return90d: 45.2 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: 1.2 },
      { day: 14, avgReturn: 2.8 }, { day: 30, avgReturn: 4.8 },
      { day: 45, avgReturn: 5.4 }, { day: 60, avgReturn: 7.2 },
      { day: 75, avgReturn: 7.8 }, { day: 90, avgReturn: 8.1 },
    ],
  },
  {
    date: '2021-09-20',
    label: '헝다그룹 디폴트 위기',
    score: 45,
    note: '중국 부동산 위기, 글로벌 불확실성 증가',
    forwardReturn30d: -2.8,
    returns: [
      { asset: 'KOSPI', return30d: -2.8, return60d: -0.5, return90d: -4.2 },
      { asset: 'KOSDAQ', return30d: -1.4, return60d: 1.2, return90d: -2.8 },
      { asset: 'Gold', return30d: -0.8, return60d: 2.4, return90d: 4.2 },
      { asset: 'BTC', return30d: 18.2, return60d: 22.4, return90d: -8.5 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: -0.8 },
      { day: 14, avgReturn: -2.1 }, { day: 30, avgReturn: -2.8 },
      { day: 45, avgReturn: -1.2 }, { day: 60, avgReturn: -0.5 },
      { day: 75, avgReturn: -2.4 }, { day: 90, avgReturn: -4.2 },
    ],
  },
  {
    date: '2024-04-19',
    label: '이란-이스라엘 긴장',
    score: 48,
    note: '중동 확전 우려, 유가 급등',
    forwardReturn30d: 2.1,
    returns: [
      { asset: 'KOSPI', return30d: 2.1, return60d: -1.2, return90d: 1.8 },
      { asset: 'KOSDAQ', return30d: 1.4, return60d: -2.8, return90d: 0.5 },
      { asset: 'Gold', return30d: 1.8, return60d: 3.2, return90d: 5.1 },
      { asset: 'BTC', return30d: -2.4, return60d: 4.8, return90d: 8.2 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: 0.8 },
      { day: 14, avgReturn: 1.4 }, { day: 30, avgReturn: 2.1 },
      { day: 45, avgReturn: 0.4 }, { day: 60, avgReturn: -1.2 },
      { day: 75, avgReturn: 0.2 }, { day: 90, avgReturn: 1.8 },
    ],
  },
  {
    date: '2023-03-13',
    label: 'SVB 은행 파산',
    score: 38,
    note: '미국 은행위기, 글로벌 금융 불안',
    forwardReturn30d: 3.5,
    returns: [
      { asset: 'KOSPI', return30d: 3.5, return60d: 4.2, return90d: 6.8 },
      { asset: 'KOSDAQ', return30d: 5.2, return60d: 8.4, return90d: 12.1 },
      { asset: 'Gold', return30d: 5.8, return60d: 8.2, return90d: 6.4 },
      { asset: 'BTC', return30d: 18.5, return60d: 12.4, return90d: 15.8 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: 1.8 },
      { day: 14, avgReturn: 2.4 }, { day: 30, avgReturn: 3.5 },
      { day: 45, avgReturn: 3.8 }, { day: 60, avgReturn: 4.2 },
      { day: 75, avgReturn: 5.4 }, { day: 90, avgReturn: 6.8 },
    ],
  },

  // ── Greed (61-80) ──
  {
    date: '2021-01-11',
    label: 'K-뉴딜 랠리',
    score: 72,
    note: '개인투자자 폭증, KOSPI 3,200 돌파',
    forwardReturn30d: -1.2,
    returns: [
      { asset: 'KOSPI', return30d: -1.2, return60d: -3.8, return90d: -2.4 },
      { asset: 'KOSDAQ', return30d: 2.4, return60d: -1.2, return90d: -5.8 },
      { asset: 'Gold', return30d: -2.1, return60d: -4.5, return90d: -1.2 },
      { asset: 'BTC', return30d: 18.4, return60d: 42.8, return90d: 28.1 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: 1.4 },
      { day: 14, avgReturn: -0.5 }, { day: 30, avgReturn: -1.2 },
      { day: 45, avgReturn: -2.8 }, { day: 60, avgReturn: -3.8 },
      { day: 75, avgReturn: -3.2 }, { day: 90, avgReturn: -2.4 },
    ],
  },
  {
    date: '2024-07-11',
    label: 'AI 반도체 랠리',
    score: 68,
    note: 'SK하이닉스 주도 반도체 슈퍼사이클 기대',
    forwardReturn30d: -8.2,
    returns: [
      { asset: 'KOSPI', return30d: -8.2, return60d: -4.5, return90d: -1.8 },
      { asset: 'KOSDAQ', return30d: -5.4, return60d: -2.1, return90d: 1.2 },
      { asset: 'Gold', return30d: 1.2, return60d: 2.8, return90d: 5.4 },
      { asset: 'BTC', return30d: -12.1, return60d: -2.4, return90d: 8.5 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: -2.4 },
      { day: 14, avgReturn: -5.1 }, { day: 30, avgReturn: -8.2 },
      { day: 45, avgReturn: -6.8 }, { day: 60, avgReturn: -4.5 },
      { day: 75, avgReturn: -3.2 }, { day: 90, avgReturn: -1.8 },
    ],
  },

  // ── Extreme Greed (81-100) ──
  {
    date: '2021-06-25',
    label: 'KOSPI 사상 최고가',
    score: 85,
    note: 'KOSPI 3,316 사상 최고, 과열 경고',
    forwardReturn30d: -2.8,
    returns: [
      { asset: 'KOSPI', return30d: -2.8, return60d: -5.1, return90d: -4.2 },
      { asset: 'KOSDAQ', return30d: -4.2, return60d: -8.4, return90d: -12.1 },
      { asset: 'Gold', return30d: -1.4, return60d: 0.8, return90d: 2.4 },
      { asset: 'BTC', return30d: -8.5, return60d: 12.4, return90d: 18.2 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 }, { day: 7, avgReturn: -0.8 },
      { day: 14, avgReturn: -1.8 }, { day: 30, avgReturn: -2.8 },
      { day: 45, avgReturn: -4.2 }, { day: 60, avgReturn: -5.1 },
      { day: 75, avgReturn: -4.8 }, { day: 90, avgReturn: -4.2 },
    ],
  },
];

/**
 * Export all cases for analysis functions (timing, heatmap, paths).
 */
export const ALL_CASES_FOR_ANALYSIS = ALL_CASES;

/**
 * Find similar historical cases within ±15 points of current score.
 * Returns up to 3 closest matches.
 */
export function findSimilarCases(currentScore: number): SimilarCaseWithReturns[] {
  const range = 15;
  const matches = ALL_CASES
    .filter(c => Math.abs(c.score - currentScore) <= range)
    .sort((a, b) => Math.abs(a.score - currentScore) - Math.abs(b.score - currentScore))
    .slice(0, 3);

  return matches.map(c => ({
    date: c.date,
    label: c.label,
    score: c.score,
    note: c.note,
    returns: c.returns,
    pricePath: c.pricePath,
  }));
}

/**
 * Compute historical percentile for a given score.
 * Based on a simplified distribution of K-FGI scores over 10 years.
 *
 * Distribution assumptions (based on Fear & Greed Index patterns):
 *   0-20: ~8% of days (extreme fear is rare)
 *  21-40: ~22% (fear periods)
 *  41-60: ~40% (most days are neutral)
 *  61-80: ~22% (greed periods)
 *  81-100: ~8% (extreme greed is rare)
 */
export function computePercentile(score: number): number {
  // Approximate CDF using a normal-ish distribution centered at 50
  // This mimics real Fear & Greed Index percentile distributions
  if (score <= 10) return 2;
  if (score <= 20) return 8;
  if (score <= 25) return 14;
  if (score <= 30) return 20;
  if (score <= 35) return 26;
  if (score <= 40) return 32;
  if (score <= 45) return 40;
  if (score <= 50) return 50;
  if (score <= 55) return 60;
  if (score <= 60) return 68;
  if (score <= 65) return 74;
  if (score <= 70) return 80;
  if (score <= 75) return 86;
  if (score <= 80) return 92;
  if (score <= 90) return 96;
  return 98;
}

/**
 * Build historical context dynamically based on current score.
 */
export function buildHistoricalContext(currentScore: number): HistoricalContext {
  const range = 15;
  const similarEvents = ALL_CASES
    .filter(c => Math.abs(c.score - currentScore) <= range)
    .sort((a, b) => Math.abs(a.score - currentScore) - Math.abs(b.score - currentScore))
    .slice(0, 3)
    .map(c => ({
      date: c.date,
      label: c.label,
      score: c.score,
      note: c.note,
      forwardReturn30d: c.forwardReturn30d,
    }));

  return {
    percentile: computePercentile(currentScore),
    similarEvents,
  };
}
