import type { SignalKey } from '../types/kfgi';

export interface SignalConfig {
  key: SignalKey;
  label: string;
  labelEn: string;
  description: string;
  formula: string;
  /** Raw value range for normalization [min, max] */
  rawRange: [number, number];
  /** If true, higher raw value maps to LOWER score (fear) */
  inverted: boolean;
}

export const SIGNAL_CONFIGS: Record<SignalKey, SignalConfig> = {
  momentum: {
    key: 'momentum',
    label: 'KOSPI 모멘텀',
    labelEn: 'KOSPI Momentum',
    description:
      'KOSPI가 125일 이동평균 대비 얼마나 위/아래에 있는지 측정합니다.',
    formula: '(KOSPI / 125일 SMA - 1) × 100',
    rawRange: [-8, 8],
    inverted: false,
  },
  strength: {
    key: 'strength',
    label: '주가 강도',
    labelEn: 'Stock Price Strength',
    description:
      'KOSPI+KOSDAQ 52주 신고가 종목 비율로 시장 전반의 강도를 측정합니다.',
    formula: '52주 신고가 / (신고가 + 신저가)',
    rawRange: [0.1, 0.9],
    inverted: false,
  },
  breadth: {
    key: 'breadth',
    label: '시장 폭',
    labelEn: 'Market Breadth',
    description:
      '상승 종목 수와 하락 종목 수의 비율로 시장 참여 폭을 측정합니다.',
    formula: '상승 종목 수 / (상승 + 하락)',
    rawRange: [0.3, 0.7],
    inverted: false,
  },
  putCall: {
    key: 'putCall',
    label: '풋/콜 비율',
    labelEn: 'Put/Call Ratio',
    description:
      'KOSPI200 풋/콜 비율로 투자자들의 헤지 수요 강도를 측정합니다.',
    formula: 'Put Volume / Call Volume',
    rawRange: [0.6, 1.4],
    inverted: true,
  },
  safeHaven: {
    key: 'safeHaven',
    label: '안전자산 수요',
    labelEn: 'Safe Haven Demand',
    description:
      'KOSPI와 국채 ETF의 20일 수익률 차이로 안전자산 선호 강도를 측정합니다.',
    formula: 'KOSPI 20일 수익률 − 국채 ETF 20일 수익률',
    rawRange: [-10, 10],
    inverted: false,
  },
  volatility: {
    key: 'volatility',
    label: '시장 변동성',
    labelEn: 'Market Volatility (VKOSPI)',
    description: 'VKOSPI가 높을수록 공포, 낮을수록 탐욕을 나타냅니다.',
    formula: 'VKOSPI',
    rawRange: [12, 35],
    inverted: true,
  },
  credit: {
    key: 'credit',
    label: '신용 스프레드',
    labelEn: 'Credit Spread',
    description:
      '회사채(AA-)와 국고채(3년)의 금리 차이로 위험 선호 강도를 측정합니다.',
    formula: '회사채 AA- 3년 − 국고채 3년 (bps)',
    rawRange: [40, 150],
    inverted: true,
  },
};

export const SIGNAL_KEYS: SignalKey[] = Object.keys(SIGNAL_CONFIGS) as SignalKey[];
