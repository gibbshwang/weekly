import type { ForwardReturnMetric } from '../types/kfgi';

export interface PriceSeries {
  asset: string;
  data: Array<{ date: string; price: number }>;
}

/**
 * Compute forward return metrics for a set of entry dates
 * against an asset price series over a given horizon.
 */
export function computeForwardReturns(
  entryDates: string[],
  priceSeries: PriceSeries,
  horizonDays: number,
): ForwardReturnMetric {
  const priceMap = new Map<string, number>();
  for (const p of priceSeries.data) {
    priceMap.set(p.date, p.price);
  }

  // Sort all available dates for forward lookup
  const sortedDates = priceSeries.data.map((p) => p.date).sort();

  const returns: number[] = [];

  for (const entryDate of entryDates) {
    const entryPrice = priceMap.get(entryDate);
    if (entryPrice === undefined) continue;

    // Find the date ~horizonDays trading days forward
    const entryIdx = sortedDates.indexOf(entryDate);
    if (entryIdx === -1) continue;

    const exitIdx = entryIdx + horizonDays;
    if (exitIdx >= sortedDates.length) continue;

    const exitPrice = priceMap.get(sortedDates[exitIdx]);
    if (exitPrice === undefined) continue;

    const ret = ((exitPrice - entryPrice) / entryPrice) * 100;
    returns.push(ret);
  }

  if (returns.length === 0) {
    return { avg: 0, median: 0, winRate: 0 };
  }

  const sorted = [...returns].sort((a, b) => a - b);
  const avg = returns.reduce((s, v) => s + v, 0) / returns.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  const winRate = (returns.filter((r) => r > 0).length / returns.length) * 100;

  return {
    avg: Math.round(avg * 10) / 10,
    median: Math.round(median * 10) / 10,
    winRate: Math.round(winRate),
  };
}
