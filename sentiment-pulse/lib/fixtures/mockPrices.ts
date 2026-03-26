import type { PriceSeries } from '../analysis/forwardReturns';

/**
 * Generate synthetic daily price series for analysis module.
 * ~500 trading days (≈2 years) per asset, ending at 2026-03-24.
 */

function generatePriceSeries(
  asset: string,
  startPrice: number,
  annualReturn: number,
  annualVol: number,
  days: number = 500,
): PriceSeries {
  const data: Array<{ date: string; price: number }> = [];
  const endDate = new Date('2026-03-24');
  const dailyReturn = annualReturn / 252;
  const dailyVol = annualVol / Math.sqrt(252);

  let price = startPrice;

  // Simple seeded pseudo-random for reproducibility
  let seed = hashCode(asset);
  function pseudoRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function normalRandom(): number {
    // Box-Muller
    const u1 = pseudoRandom() || 0.0001;
    const u2 = pseudoRandom();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);

    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const ret = dailyReturn + dailyVol * normalRandom();
    price = price * (1 + ret);
    if (price < 1) price = 1;

    data.push({
      date: d.toISOString().slice(0, 10),
      price: Math.round(price * 100) / 100,
    });
  }

  return { asset, data };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const MOCK_ASSET_PRICES: PriceSeries[] = [
  generatePriceSeries('KOSPI', 2400, 0.06, 0.18),
  generatePriceSeries('KOSDAQ', 700, 0.08, 0.25),
  generatePriceSeries('S&P 500', 5200, 0.10, 0.16),
  generatePriceSeries('BTC', 65000, 0.30, 0.60),
  generatePriceSeries('ETH', 3200, 0.25, 0.70),
  generatePriceSeries('Gold', 2100, 0.05, 0.14),
  generatePriceSeries('Oil', 75, 0.02, 0.30),
];
