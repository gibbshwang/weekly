export const componentDescriptions = {
  momentum: {
    title: "시장 모멘텀",
    description: "S&P 500이 125일 이동평균 대비 얼마나 위/아래에 있는지 측정합니다.",
    formula: "S&P 500 ÷ 125일 SMA",
    phase: "phase_1" as const,
  },
  volatility: {
    title: "시장 변동성",
    description: "VIX(공포지수)가 50일 이동평균 대비 높을수록 공포, 낮을수록 탐욕을 나타냅니다.",
    formula: "VIX ÷ 50일 SMA (역방향)",
    phase: "phase_1" as const,
  },
  safe_haven: {
    title: "안전자산 수요",
    description: "주식(SPY)과 채권(TLT)의 20일 수익률 차이로 안전자산 선호 강도를 측정합니다.",
    formula: "SPY 20일 수익률 − TLT 20일 수익률",
    phase: "phase_1" as const,
  },
  junk_bond: {
    title: "정크본드 수요",
    description: "하이일드 채권(HYG)과 투자등급 채권(LQD)의 성과 차이로 위험 선호 강도를 측정합니다.",
    formula: "HYG 수익률 − LQD 수익률",
    phase: "phase_1" as const,
  },
  strength: {
    title: "주가 강도",
    description: "NYSE 52주 신고가 종목 비율로 시장 전반의 강도를 측정합니다.",
    formula: "52주 신고가 ÷ (신고가 + 신저가)",
    phase: "phase_1_5" as const,
  },
  put_call: {
    title: "풋/콜 비율",
    description: "CBOE 풋/콜 비율로 투자자들의 헤지 수요 강도를 측정합니다.",
    formula: "CBOE Put/Call Ratio (역방향)",
    phase: "phase_1_5" as const,
  },
  breadth: {
    title: "주가 폭",
    description: "맥클레란 누적지수(McClellan Summation Index)로 시장 참여 폭을 측정합니다.",
    formula: "McClellan Summation Index",
    phase: "phase_2" as const,
  },
};
