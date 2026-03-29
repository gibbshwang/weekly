import type { RegimeType } from './kfgi';
import type { NarrativeAsset } from './narrative';

/** Asset options for Chart A selector — derived from NarrativeAsset (single source of truth) */
export type ChartAsset = NarrativeAsset;

/** Time range options for Chart A selector */
export type TimeRange = '1M' | '3M' | '6M' | '1Y';

/** Single data point for the K-FGI vs price dual-axis chart */
export interface KfgiPricePoint {
  date: string;
  score: number;        // K-FGI 0-100
  priceIndex: number;   // rebased price (100 = start of window)
  regime: RegimeType;
}

/** Post-signal price path data point */
export interface PostSignalPathPoint {
  day: number;          // 0, 7, 30, 90, 180
  avgReturn: number;    // average % return at this horizon
}

/** Data for the post-signal mini chart */
export interface PostSignalPathData {
  asset: string;
  points: PostSignalPathPoint[];
}

/** Precomputed data for all Chart A combinations */
export type KfgiPriceData = Record<ChartAsset, Record<TimeRange, KfgiPricePoint[]>>;
