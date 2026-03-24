export const mockScore = {
  date: "2026-03-24",
  score: 31,
  regime: "fear" as const,
  vix_raw: 24.8,
  change: -3,
  components: [
    { id: "momentum", label: "시장 모멘텀", labelEn: "Market Momentum", score: 28, status: "active" as const, direction: "fear" as const, note: "S&P 500이 125일 이동평균 하회" },
    { id: "volatility", label: "시장 변동성", labelEn: "Market Volatility", score: 35, status: "active" as const, direction: "fear" as const, note: "VIX 50일 평균 대비 높은 수준" },
    { id: "safe_haven", label: "안전자산 수요", labelEn: "Safe Haven Demand", score: 22, status: "active" as const, direction: "fear" as const, note: "채권 대비 주식 약세" },
    { id: "junk_bond", label: "정크본드 수요", labelEn: "Junk Bond Demand", score: 38, status: "active" as const, direction: "neutral" as const, note: "HYG/LQD 스프레드 확대 중" },
    { id: "strength", label: "주가 강도", labelEn: "Stock Price Strength", score: null, status: "phase_1_5" as const, direction: null, note: "Phase 1.5 준비 중" },
    { id: "put_call", label: "풋/콜 비율", labelEn: "Put/Call Options", score: null, status: "phase_1_5" as const, direction: null, note: "Phase 1.5 준비 중" },
    { id: "breadth", label: "주가 폭", labelEn: "Stock Price Breadth", score: null, status: "phase_2" as const, direction: null, note: "Phase 2 준비 중" },
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
    { date: "2024-08-05", label: "엔 캐리 트레이드 청산", score: 21, note: "일본은행 금리 인상 후 급격한 포지션 청산" },
    { date: "2023-03-13", label: "SVB 사태", score: 20, note: "실리콘밸리 뱅크 파산 직후" },
    { date: "2022-10-13", label: "CPI 충격", score: 18, note: "예상 상회 CPI 발표 후 패닉 매도" },
  ],
};
