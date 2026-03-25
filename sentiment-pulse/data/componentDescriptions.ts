export const componentDescriptions: Record<string, {
  title: string;
  description: string;
  formula: string;
}> = {
  momentum: {
    title: "KOSPI 모멘텀",
    description: "KOSPI가 125일 이동평균 대비 얼마나 위/아래에 있는지 측정합니다.",
    formula: "KOSPI / 125일 SMA",
  },
  volatility: {
    title: "시장 변동성",
    description: "VKOSPI가 50일 이동평균 대비 높을수록 공포, 낮을수록 탐욕을 나타냅니다.",
    formula: "VKOSPI / 50일 SMA (역방향)",
  },
  safeHaven: {
    title: "안전자산 수요",
    description: "KOSPI와 국채 ETF의 20일 수익률 차이로 안전자산 선호 강도를 측정합니다.",
    formula: "KOSPI 20일 수익률 − 국채 ETF 20일 수익률",
  },
  credit: {
    title: "신용 스프레드",
    description: "회사채(AA-)와 국고채(3년)의 금리 차이로 위험 선호 강도를 측정합니다.",
    formula: "회사채 AA- 3년 − 국고채 3년",
  },
  strength: {
    title: "주가 강도",
    description: "KOSPI+KOSDAQ 52주 신고가 종목 비율로 시장 전반의 강도를 측정합니다.",
    formula: "52주 신고가 / (신고가 + 신저가)",
  },
  putCall: {
    title: "풋/콜 비율",
    description: "KOSPI200 풋/콜 비율로 투자자들의 헤지 수요 강도를 측정합니다.",
    formula: "KOSPI200 Put/Call Ratio (역방향)",
  },
  breadth: {
    title: "시장 폭",
    description: "상승 종목 수와 하락 종목 수의 비율로 시장 참여 폭을 측정합니다.",
    formula: "상승 종목 수 / 전체 종목 수",
  },
};
