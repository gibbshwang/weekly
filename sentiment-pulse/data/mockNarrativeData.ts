import type { SimilarCaseWithReturns } from '@/lib/types/narrative';

/**
 * Hardcoded similar case data for prototype.
 * Each case has per-asset forward returns and a KOSPI price path.
 * Real data will replace this once Phase 1 (data sourcing) is complete.
 */
export const mockSimilarCases: SimilarCaseWithReturns[] = [
  {
    date: "2024-08-05",
    label: "엔 캐리 트레이드 청산",
    score: 21,
    note: "일본은행 금리 인상 후 KOSPI 급락",
    returns: [
      { asset: "KOSPI",  return30d: 3.2,  return60d: 5.1,  return90d: 12.4 },
      { asset: "KOSDAQ", return30d: 1.8,  return60d: 2.4,  return90d: 8.7 },
      { asset: "Gold",   return30d: 0.5,  return60d: 1.2,  return90d: 2.1 },
      { asset: "BTC",    return30d: 8.4,  return60d: 15.2, return90d: 28.3 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 },
      { day: 7, avgReturn: 1.2 },
      { day: 14, avgReturn: -0.8 },
      { day: 30, avgReturn: 3.2 },
      { day: 45, avgReturn: 4.1 },
      { day: 60, avgReturn: 5.1 },
      { day: 75, avgReturn: 8.8 },
      { day: 90, avgReturn: 12.4 },
    ],
  },
  {
    date: "2022-09-26",
    label: "레고랜드 사태",
    score: 19,
    note: "강원도 ABCP 채무불이행으로 신용경색 확산",
    returns: [
      { asset: "KOSPI",  return30d: -2.1, return60d: 4.8,  return90d: 9.6 },
      { asset: "KOSDAQ", return30d: -3.4, return60d: 1.2,  return90d: 6.1 },
      { asset: "Gold",   return30d: 2.1,  return60d: 3.8,  return90d: 5.4 },
      { asset: "BTC",    return30d: -4.2, return60d: -1.8,  return90d: -8.5 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 },
      { day: 7, avgReturn: -1.5 },
      { day: 14, avgReturn: -3.2 },
      { day: 30, avgReturn: -2.1 },
      { day: 45, avgReturn: 1.4 },
      { day: 60, avgReturn: 4.8 },
      { day: 75, avgReturn: 7.2 },
      { day: 90, avgReturn: 9.6 },
    ],
  },
  {
    date: "2020-03-19",
    label: "코로나 팬데믹 저점",
    score: 12,
    note: "KOSPI 1,400대 붕괴, 사이드카 발동",
    returns: [
      { asset: "KOSPI",  return30d: 14.8, return60d: 22.1, return90d: 35.2 },
      { asset: "KOSDAQ", return30d: 18.2, return60d: 28.4, return90d: 42.1 },
      { asset: "Gold",   return30d: 4.2,  return60d: 6.8,  return90d: 8.1 },
      { asset: "BTC",    return30d: 22.5, return60d: 38.4, return90d: 52.8 },
    ],
    pricePath: [
      { day: 0, avgReturn: 0 },
      { day: 7, avgReturn: 5.4 },
      { day: 14, avgReturn: 8.2 },
      { day: 30, avgReturn: 14.8 },
      { day: 45, avgReturn: 18.6 },
      { day: 60, avgReturn: 22.1 },
      { day: 75, avgReturn: 28.4 },
      { day: 90, avgReturn: 35.2 },
    ],
  },
];
