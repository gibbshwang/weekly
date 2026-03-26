export const ANALYSIS_ASSETS = [
  'KOSPI',
  'KOSDAQ',
  'S&P 500',
  'BTC',
  'ETH',
  'Gold',
  'Oil',
] as const;

export type AnalysisAsset = (typeof ANALYSIS_ASSETS)[number];

export const HORIZONS = ['7D', '30D', '90D', '180D'] as const;
export type Horizon = (typeof HORIZONS)[number];

export const HORIZON_DAYS: Record<Horizon, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '180D': 180,
};
