import { Regime } from "./interpretations";

export type AssetClass = "us_equity" | "bonds_usd" | "kr_equity" | "crypto";

export const assetLabels: Record<AssetClass, { label: string; emoji: string }> = {
  us_equity: { label: "미국주식", emoji: "🇺🇸" },
  bonds_usd: { label: "채권·달러", emoji: "💵" },
  kr_equity: { label: "국내주식", emoji: "🇰🇷" },
  crypto: { label: "코인", emoji: "₿" },
};

export const assetImplications: Record<Regime, Record<AssetClass, { pattern: string; usageNote: string }>> = {
  fear: {
    us_equity: {
      pattern: "변동성이 높아지며 섹터별 차별화가 나타나는 경향이 있습니다. 경기방어주 및 배당주가 상대적 강세를 보이는 패턴이 자주 관찰됩니다.",
      usageNote: "일시 집중 매수보다 분할 접근이 일반적으로 고려되는 프레임입니다.",
    },
    bonds_usd: {
      pattern: "안전자산 수요 증가로 국채 가격 상승(금리 하락) 및 달러 강세 패턴이 나타납니다.",
      usageNote: "채권 비중 확대를 포트폴리오 방어 전략으로 고려하는 시점입니다.",
    },
    kr_equity: {
      pattern: "외국인 수급이 약화되며 원화 약세 압력이 동반되는 경향이 있습니다. 수출주보다 내수주가 상대적으로 안정적인 패턴입니다.",
      usageNote: "환율 리스크를 함께 고려한 포지션 관리가 일반적입니다.",
    },
    crypto: {
      pattern: "위험자산 회피 심리로 변동성이 확대되며 전반적 약세 경향이 나타납니다.",
      usageNote: "비중 축소 또는 현금 확보를 검토하는 시점으로 관찰됩니다.",
    },
  },
  extreme_fear: {
    us_equity: {
      pattern: "과도한 매도로 인한 가격 왜곡이 나타나는 경향이 있습니다. 역사적으로 이 구간에서 중장기 매수 기회가 형성되는 경우가 많았습니다.",
      usageNote: "일시 집중 매수보다 분할 접근이 일반적으로 고려되는 프레임입니다.",
    },
    bonds_usd: {
      pattern: "극단적 안전자산 선호로 미국 국채 및 달러 강세가 두드러지는 패턴입니다.",
      usageNote: "달러/국채 비중을 포트폴리오 완충재로 활용하는 접근이 일반적입니다.",
    },
    kr_equity: {
      pattern: "외국인 대규모 이탈과 원화 급락이 동반되는 경향이 강합니다.",
      usageNote: "해외 자산 비중 검토 및 환헤지 전략 고려가 일반적입니다.",
    },
    crypto: {
      pattern: "가장 높은 변동성을 보이며 급격한 하락이 발생하는 경향이 있습니다.",
      usageNote: "고위험 자산 비중 최소화가 일반적으로 고려되는 프레임입니다.",
    },
  },
  neutral: {
    us_equity: {
      pattern: "뚜렷한 방향성 없이 박스권 흐름이 지속되는 경향이 있습니다.",
      usageNote: "모멘텀 확인 후 방향성 매매를 준비하는 시점으로 관찰됩니다.",
    },
    bonds_usd: {
      pattern: "특별한 방향성 없이 경제 지표에 따라 움직이는 패턴입니다.",
      usageNote: "기존 채권 비중을 유지하며 금리 동향을 모니터링하는 것이 일반적입니다.",
    },
    kr_equity: {
      pattern: "글로벌 대비 독립적인 움직임을 보이는 경우가 많습니다.",
      usageNote: "국내 경기 지표와 외국인 수급을 함께 확인하는 것이 일반적입니다.",
    },
    crypto: {
      pattern: "시장 전반의 낮은 변동성을 반영하며 비교적 안정적인 흐름을 보입니다.",
      usageNote: "방향성 확인 전 큰 포지션 변경보다는 모니터링이 일반적입니다.",
    },
  },
  greed: {
    us_equity: {
      pattern: "강한 모멘텀이 지속되며 성장주와 기술주 중심의 강세가 나타나는 패턴입니다.",
      usageNote: "추세 추종 전략이 유효하지만 수익 실현 계획도 함께 수립하는 것이 일반적입니다.",
    },
    bonds_usd: {
      pattern: "위험자산 선호로 안전자산 수요가 감소하며 국채 금리 상승 패턴이 나타납니다.",
      usageNote: "채권 비중 축소를 점진적으로 검토할 수 있는 시점입니다.",
    },
    kr_equity: {
      pattern: "외국인 수급 유입과 함께 코스피 강세가 나타나는 경향이 있습니다.",
      usageNote: "글로벌 강세와 동반 상승하는 섹터에 집중하는 접근이 일반적입니다.",
    },
    crypto: {
      pattern: "위험자산 선호 확산으로 강세 패턴이 나타나는 경향이 있습니다.",
      usageNote: "리스크 관리를 유지하며 접근하는 것이 일반적으로 고려됩니다.",
    },
  },
  extreme_greed: {
    us_equity: {
      pattern: "단기 과열 신호가 나타나며 변동성 확대 리스크가 증가하는 구간입니다.",
      usageNote: "수익 실현 및 리스크 축소가 일반적으로 고려되는 프레임입니다.",
    },
    bonds_usd: {
      pattern: "금리 상승 압력이 강해지며 채권 가격 하락 압력이 나타납니다.",
      usageNote: "듀레이션 관리에 집중하는 것이 일반적입니다.",
    },
    kr_equity: {
      pattern: "글로벌 탐욕 구간에서 코스피도 동반 상승하지만 외국인 이익실현에 주의가 필요합니다.",
      usageNote: "수급 모니터링을 강화하는 시점으로 관찰됩니다.",
    },
    crypto: {
      pattern: "단기 급등 후 급락 패턴이 자주 나타나는 극단 구간입니다.",
      usageNote: "고위험 자산의 비중 관리에 특히 주의가 필요한 시점입니다.",
    },
  },
};
