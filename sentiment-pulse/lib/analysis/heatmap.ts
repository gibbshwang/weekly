import type {
  HeatmapData,
  HistoryPoint,
  RegimeType,
  ForwardReturnMetric,
} from '../types/kfgi';
import { HORIZONS, HORIZON_DAYS } from '../config/assets';
import { computeForwardReturns, type PriceSeries } from './forwardReturns';

/**
 * Build cross-asset heatmap for the current regime.
 * Filters history to same-regime periods, then computes forward returns.
 */
export function buildHeatmapData(
  currentRegime: RegimeType,
  history: HistoryPoint[],
  assetPrices: PriceSeries[],
): HeatmapData {
  // Get entry dates from same-regime historical periods
  const regimeEntries = history
    .filter((h) => h.regime === currentRegime)
    .map((h) => h.date);

  const assets = assetPrices.map((ps) => ps.asset);
  const horizons = [...HORIZONS];

  const data: Record<string, Record<string, ForwardReturnMetric>> = {};

  for (const ps of assetPrices) {
    data[ps.asset] = {};
    for (const horizon of HORIZONS) {
      data[ps.asset][horizon] = computeForwardReturns(
        regimeEntries,
        ps,
        HORIZON_DAYS[horizon],
      );
    }
  }

  return { assets, horizons, data };
}
