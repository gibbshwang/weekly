export type Regime = "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";

export const interpretations: Record<Regime, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  interpretation: string;
  drivingFactors: string;
  usagePoints: string[];
  watchFor: string[];
}> = {
  extreme_fear: {
    label: "극단적 공포",
    color: "#dc2626",
    bgColor: "bg-red-700",
    textColor: "text-red-700",
    interpretation: "시장 전반에 걸쳐 극단적인 공포가 지배하고 있습니다. 투자자들이 공황 상태에서 위험자산을 일괄 매도하는 경향이 나타나고 있으며, 이는 과도한 가격 왜곡으로 이어질 수 있습니다.",
    drivingFactors: "VKOSPI 급등 및 안전자산으로의 급격한 자금 이동이 주된 원인입니다.",
    usagePoints: [
      "과거 유사 구간에서는 분할 매수 전략이 일반적으로 고려되어 왔습니다",
      "단기 반등 가능성이 높아지는 시점이지만, 추세 반전 확인이 중요합니다",
      "포트폴리오 리밸런싱을 검토하기에 적합한 시점일 수 있습니다",
    ],
    watchFor: ["VKOSPI 30 이하 안정화", "KOSPI 125일 이평선 회복", "회사채-국고채 스프레드 축소"],
  },
  fear: {
    label: "공포",
    color: "#ef4444",
    bgColor: "bg-red-500",
    textColor: "text-red-500",
    interpretation: "투자자들이 위험자산을 회피하고 안전자산으로 이동하는 패턴이 나타나고 있습니다. 시장 불확실성이 높아져 있으며, 기관 투자자들의 방어적 포지션 전환이 감지됩니다.",
    drivingFactors: "시장 모멘텀 약화와 변동성 확대가 복합적으로 작용하고 있습니다.",
    usagePoints: [
      "방어적 자산 비중 확대를 고려하는 시점으로 관찰됩니다",
      "가치주 및 배당주 중심의 접근이 과거에 자주 관찰된 패턴입니다",
      "신규 진입 시 분할 매수로 리스크를 분산하는 것이 일반적입니다",
    ],
    watchFor: ["KOSPI 125일 이평선 회복 시도", "VKOSPI 20 이하 안정", "외국인 순매수 전환"],
  },
  neutral: {
    label: "중립",
    color: "#6b7280",
    bgColor: "bg-gray-500",
    textColor: "text-gray-500",
    interpretation: "시장이 공포와 탐욕 사이의 균형 지점에 위치해 있습니다. 뚜렷한 방향성 없이 관망세가 지속되고 있으며, 다음 촉매 이벤트를 기다리는 분위기입니다.",
    drivingFactors: "각 지표들이 상반된 신호를 보내며 방향성이 불분명한 상태입니다.",
    usagePoints: [
      "기존 포트폴리오 유지 및 모니터링에 집중하는 시기로 관찰됩니다",
      "다음 방향성 확인 후 비중을 조정하는 접근이 일반적입니다",
      "분할 매수/매도 양방향 준비가 유효한 전략으로 고려됩니다",
    ],
    watchFor: ["지수 방향성 확인", "외국인/기관 수급 변화", "VKOSPI 방향성"],
  },
  greed: {
    label: "탐욕",
    color: "#22c55e",
    bgColor: "bg-green-500",
    textColor: "text-green-500",
    interpretation: "위험자산 선호 심리가 강해지면서 시장에 낙관론이 퍼지고 있습니다. 모멘텀 전략이 유효하게 작동하고 있으나, 과열 여부를 지속적으로 모니터링할 필요가 있습니다.",
    drivingFactors: "강한 가격 모멘텀과 낮은 변동성이 탐욕 심리를 강화하고 있습니다.",
    usagePoints: [
      "상승 추세 지속 시 모멘텀 전략이 유효하게 작동하는 경향이 있습니다",
      "수익 실현 계획 수립을 점진적으로 검토할 시점입니다",
      "리스크 관리 강화가 일반적으로 권장되는 프레임입니다",
    ],
    watchFor: ["80 이상 극단적 탐욕 진입 여부", "KOSPI 과열 지표 확인", "국고채 금리 급등 여부"],
  },
  extreme_greed: {
    label: "극단적 탐욕",
    color: "#d97706",
    bgColor: "bg-amber-600",
    textColor: "text-amber-600",
    interpretation: "시장에 극단적인 낙관론이 만연해 있습니다. 역사적으로 이 수준에서는 단기 조정 리스크가 높아지는 경향이 있으며, 신규 진입보다는 포지션 관리에 집중하는 것이 일반적입니다.",
    drivingFactors: "전 구성 지표가 일제히 탐욕 구간을 가리키며 과열 신호를 보내고 있습니다.",
    usagePoints: [
      "과거 유사 구간에서 단기 조정이 자주 관찰되었습니다",
      "수익 실현 및 포지션 축소를 점진적으로 검토하는 프레임이 일반적입니다",
      "신규 진입은 리스크 대비 기대수익을 신중하게 평가하는 것이 일반적입니다",
    ],
    watchFor: ["VKOSPI 급등 신호", "KOSPI 이평선 이탈 여부", "신용 스프레드 확대"],
  },
};
