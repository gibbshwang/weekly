export const NARRATIVE_ASSETS = ['KOSPI', 'KOSDAQ', 'Gold', 'BTC'] as const;
export const NARRATIVE_PERIODS = [30, 60, 90] as const;

export type NarrativeAsset = typeof NARRATIVE_ASSETS[number];
export type NarrativePeriod = typeof NARRATIVE_PERIODS[number];

export interface CaseReturn {
  asset: NarrativeAsset;
  return30d: number | null;
  return60d: number | null;
  return90d: number | null;
}

export interface SimilarCaseWithReturns {
  date: string;
  label?: string;
  score: number;
  note: string;
  returns: CaseReturn[];
  pricePath: { day: number; avgReturn: number | null }[];
}

export interface ConsensusSummary {
  winRate90d: number;
  avgReturns: CaseReturn[];
  totalCases: number;
  headline: string;
}
