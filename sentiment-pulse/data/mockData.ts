import type { TimingAnalysis, HeatmapData, ForwardReturnMetric } from '@/lib/types/kfgi';

export type HeatmapMetric = ForwardReturnMetric;

export const mockScore = {
  date: "2026-03-24",
  score: 31,
  regime: "fear" as const,
  vkospi_raw: 24.8,
  change: -3,
  components: [
    { id: "momentum", label: "KOSPI 모멘텀", labelEn: "KOSPI Momentum", score: 28, status: "active" as const, direction: "fear" as const, note: "KOSPI가 125일 이동평균 하회" },
    { id: "volatility", label: "시장 변동성", labelEn: "Market Volatility (VKOSPI)", score: 35, status: "active" as const, direction: "fear" as const, note: "VKOSPI 50일 평균 대비 높은 수준" },
    { id: "safeHaven", label: "안전자산 수요", labelEn: "Safe Haven Demand", score: 22, status: "active" as const, direction: "fear" as const, note: "KOSPI 대비 국채 상대 강세" },
    { id: "credit", label: "신용 스프레드", labelEn: "Credit Spread", score: 38, status: "active" as const, direction: "neutral" as const, note: "회사채-국고채 스프레드 확대 중" },
    { id: "strength", label: "주가 강도", labelEn: "Stock Price Strength", score: 30, status: "active" as const, direction: "fear" as const, note: "KOSPI+KOSDAQ 52주 신고가/신저가 비율 하락" },
    { id: "putCall", label: "풋/콜 비율", labelEn: "Put/Call Ratio", score: 42, status: "active" as const, direction: "neutral" as const, note: "KOSPI200 풋/콜 비율 상승" },
    { id: "breadth", label: "시장 폭", labelEn: "Market Breadth", score: 25, status: "active" as const, direction: "fear" as const, note: "상승 종목 대비 하락 종목 우위" },
  ],
};

export const mockHistory = Array.from({ length: 30 }, (_, i) => {
  const date = new Date("2026-02-23");
  date.setDate(date.getDate() + i);
  const score = Math.max(10, Math.min(90, 45 + Math.sin(i * 0.4) * 20 + (Math.random() - 0.5) * 10));
  return {
    date: date.toISOString().slice(0, 10),
    score: Math.round(score),
    regime: score < 20 ? "extreme_fear" : score < 40 ? "fear" : score < 60 ? "neutral" : score < 80 ? "greed" : "extreme_greed",
  };
});

// Force last entry to match current score
mockHistory[29] = { date: "2026-03-24", score: 31, regime: "fear" };

export const mockContext = {
  percentile: 8,
  similarEvents: [
    { date: "2024-08-05", label: "엔 캐리 트레이드 청산", score: 21, note: "일본은행 금리 인상 후 KOSPI 급락" },
    { date: "2022-09-26", label: "레고랜드 사태", score: 19, note: "강원도 ABCP 채무불이행으로 신용경색 확산" },
    { date: "2020-03-19", label: "코로나 팬데믹 저점", score: 12, note: "KOSPI 1,400대 붕괴, 사이드카 발동" },
  ],
};

// ── Buy Timing mock (Fear ≤ 25) ──
export const mockBuyTiming: TimingAnalysis = {
  threshold: 25,
  caseCount: 14,
  assets: [
    { name: "KOSPI",  horizon7d: { avg: 2.1, median: 1.8, winRate: 71 }, horizon30d: { avg: 5.4, median: 4.9, winRate: 79 }, horizon90d: { avg: 9.8, median: 8.6, winRate: 86 }, horizon180d: { avg: 14.2, median: 12.1, winRate: 86 } },
    { name: "KOSDAQ", horizon7d: { avg: 2.8, median: 2.2, winRate: 64 }, horizon30d: { avg: 6.1, median: 5.3, winRate: 71 }, horizon90d: { avg: 11.5, median: 9.8, winRate: 79 }, horizon180d: { avg: 16.8, median: 13.4, winRate: 79 } },
    { name: "S&P 500", horizon7d: { avg: 1.4, median: 1.1, winRate: 64 }, horizon30d: { avg: 3.8, median: 3.2, winRate: 71 }, horizon90d: { avg: 7.2, median: 6.5, winRate: 79 }, horizon180d: { avg: 11.6, median: 10.2, winRate: 86 } },
    { name: "BTC",    horizon7d: { avg: 4.2, median: 3.1, winRate: 57 }, horizon30d: { avg: 9.6, median: 7.4, winRate: 64 }, horizon90d: { avg: 18.3, median: 14.1, winRate: 71 }, horizon180d: { avg: 28.5, median: 21.2, winRate: 71 } },
    { name: "ETH",    horizon7d: { avg: 5.1, median: 3.8, winRate: 57 }, horizon30d: { avg: 11.2, median: 8.6, winRate: 64 }, horizon90d: { avg: 22.1, median: 16.8, winRate: 71 }, horizon180d: { avg: 34.2, median: 25.1, winRate: 71 } },
    { name: "Gold",   horizon7d: { avg: 0.6, median: 0.4, winRate: 57 }, horizon30d: { avg: 1.8, median: 1.2, winRate: 64 }, horizon90d: { avg: 3.5, median: 2.8, winRate: 71 }, horizon180d: { avg: 5.2, median: 4.1, winRate: 71 } },
    { name: "Oil",    horizon7d: { avg: 3.1, median: 2.2, winRate: 50 }, horizon30d: { avg: 5.8, median: 4.1, winRate: 57 }, horizon90d: { avg: 8.4, median: 6.2, winRate: 64 }, horizon180d: { avg: 10.1, median: 7.8, winRate: 64 } },
  ],
};

// ── Sell Timing mock (Greed ≥ 75) ──
export const mockSellTiming: TimingAnalysis = {
  threshold: 75,
  caseCount: 11,
  assets: [
    { name: "KOSPI",  horizon7d: { avg: -0.8, median: -0.5, winRate: 36 }, horizon30d: { avg: -2.1, median: -1.6, winRate: 27 }, horizon90d: { avg: -4.5, median: -3.2, winRate: 27 }, horizon180d: { avg: -1.8, median: 0.4, winRate: 45 } },
    { name: "KOSDAQ", horizon7d: { avg: -1.2, median: -0.9, winRate: 27 }, horizon30d: { avg: -3.4, median: -2.5, winRate: 27 }, horizon90d: { avg: -6.1, median: -4.8, winRate: 18 }, horizon180d: { avg: -3.2, median: -1.1, winRate: 36 } },
    { name: "S&P 500", horizon7d: { avg: -0.5, median: -0.3, winRate: 45 }, horizon30d: { avg: -1.4, median: -0.8, winRate: 36 }, horizon90d: { avg: -2.8, median: -1.5, winRate: 36 }, horizon180d: { avg: 0.6, median: 1.2, winRate: 55 } },
    { name: "BTC",    horizon7d: { avg: -2.1, median: -1.4, winRate: 36 }, horizon30d: { avg: -5.8, median: -4.2, winRate: 27 }, horizon90d: { avg: -9.2, median: -6.8, winRate: 27 }, horizon180d: { avg: -3.5, median: -0.8, winRate: 45 } },
    { name: "ETH",    horizon7d: { avg: -2.8, median: -2.1, winRate: 27 }, horizon30d: { avg: -7.2, median: -5.4, winRate: 18 }, horizon90d: { avg: -12.4, median: -9.1, winRate: 18 }, horizon180d: { avg: -5.8, median: -2.4, winRate: 36 } },
    { name: "Gold",   horizon7d: { avg: 0.2, median: 0.1, winRate: 55 }, horizon30d: { avg: 0.5, median: 0.3, winRate: 55 }, horizon90d: { avg: 1.2, median: 0.8, winRate: 55 }, horizon180d: { avg: 2.4, median: 1.8, winRate: 64 } },
    { name: "Oil",    horizon7d: { avg: -1.4, median: -0.8, winRate: 36 }, horizon30d: { avg: -2.6, median: -1.5, winRate: 36 }, horizon90d: { avg: -3.8, median: -2.2, winRate: 36 }, horizon180d: { avg: -1.2, median: 0.5, winRate: 45 } },
  ],
};

// ── Cross-Asset Heatmap mock (current fear regime) ──
export const mockHeatmapData: HeatmapData = {
  assets: ["KOSPI", "KOSDAQ", "S&P 500", "BTC", "ETH", "Gold", "Oil"],
  horizons: ["7D", "30D", "90D", "180D"],
  data: {
    "KOSPI":   { "7D": { avg: 1.2, median: 0.9, winRate: 64 }, "30D": { avg: 3.8, median: 3.1, winRate: 71 }, "90D": { avg: 7.4, median: 6.2, winRate: 79 }, "180D": { avg: 11.8, median: 9.6, winRate: 79 } },
    "KOSDAQ":  { "7D": { avg: 1.6, median: 1.2, winRate: 57 }, "30D": { avg: 4.5, median: 3.6, winRate: 64 }, "90D": { avg: 8.9, median: 7.1, winRate: 71 }, "180D": { avg: 13.5, median: 10.8, winRate: 71 } },
    "S&P 500": { "7D": { avg: 0.8, median: 0.6, winRate: 57 }, "30D": { avg: 2.4, median: 1.9, winRate: 64 }, "90D": { avg: 5.1, median: 4.2, winRate: 71 }, "180D": { avg: 8.9, median: 7.5, winRate: 79 } },
    "BTC":     { "7D": { avg: 2.8, median: 1.9, winRate: 50 }, "30D": { avg: 7.2, median: 5.4, winRate: 57 }, "90D": { avg: 14.6, median: 10.8, winRate: 64 }, "180D": { avg: 22.4, median: 16.5, winRate: 64 } },
    "ETH":     { "7D": { avg: 3.4, median: 2.4, winRate: 50 }, "30D": { avg: 8.6, median: 6.2, winRate: 57 }, "90D": { avg: 17.8, median: 13.2, winRate: 64 }, "180D": { avg: 27.1, median: 19.8, winRate: 64 } },
    "Gold":    { "7D": { avg: 0.4, median: 0.3, winRate: 57 }, "30D": { avg: 1.2, median: 0.9, winRate: 57 }, "90D": { avg: 2.8, median: 2.1, winRate: 64 }, "180D": { avg: 4.5, median: 3.6, winRate: 71 } },
    "Oil":     { "7D": { avg: 1.8, median: 1.2, winRate: 50 }, "30D": { avg: 3.9, median: 2.8, winRate: 50 }, "90D": { avg: 6.2, median: 4.5, winRate: 57 }, "180D": { avg: 7.8, median: 5.6, winRate: 57 } },
  },
};
