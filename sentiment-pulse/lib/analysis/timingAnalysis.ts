import type { TimingAnalysis, TimingAsset, HistoryPoint } from '../types/kfgi';
import { HORIZON_DAYS, type Horizon } from '../config/assets';
import { extractThresholdEvents } from './eventExtractor';
import { computeForwardReturns, type PriceSeries } from './forwardReturns';

/**
 * Build a complete TimingAnalysis (buy or sell) from history + price data.
 */
export function buildTimingAnalysis(
  history: HistoryPoint[],
  assetPrices: PriceSeries[],
  threshold: number,
  direction: 'below' | 'above',
): TimingAnalysis {
  const events = extractThresholdEvents(history, threshold, direction);
  const entryDates = events.map((e) => e.date);

  const assets: TimingAsset[] = assetPrices.map((ps) => ({
    name: ps.asset,
    horizon7d: computeForwardReturns(entryDates, ps, HORIZON_DAYS['7D']),
    horizon30d: computeForwardReturns(entryDates, ps, HORIZON_DAYS['30D']),
    horizon90d: computeForwardReturns(entryDates, ps, HORIZON_DAYS['90D']),
    horizon180d: computeForwardReturns(entryDates, ps, HORIZON_DAYS['180D']),
  }));

  return {
    threshold,
    caseCount: events.length,
    assets,
  };
}
