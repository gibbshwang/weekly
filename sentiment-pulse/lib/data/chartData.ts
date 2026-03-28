import type { HistoryPoint, SignalKey, RegimeType } from '../types/kfgi';
import type {
  ChartAsset,
  TimeRange,
  KfgiPricePoint,
  KfgiPriceData,
  PostSignalPathData,
  PostSignalPathPoint,
} from '../types/charts';
import { normalizeSignal } from '../engine/normalize';
import { classifyRegime } from '../config/regime';

// ── Yahoo Finance price fetcher (server-side) ──

interface PricePoint {
  date: string;
  close: number;
}

async function fetchYahooPrices(
  symbol: string,
  range: string = '2y',
): Promise<PricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result?.timestamp || !result?.indicators?.quote?.[0]) return [];

  const quotes = result.indicators.quote[0];
  const points: PricePoint[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const close = quotes.close[i];
    if (close == null) continue;
    const d = new Date(result.timestamp[i] * 1000);
    points.push({
      date: d.toISOString().slice(0, 10),
      close,
    });
  }

  return points;
}

// ── Compute rolling K-FGI scores from KOSPI data ──

function computeRollingScores(kospiPrices: PricePoint[]): HistoryPoint[] {
  const scores: HistoryPoint[] = [];

  for (let i = 0; i < kospiPrices.length; i++) {
    const current = kospiPrices[i].close;
    const date = kospiPrices[i].date;

    // momentum: current / 125DMA - 1 * 100
    let momentumRaw: number | null = null;
    if (i >= 125) {
      const slice = kospiPrices.slice(i - 125, i);
      const sma125 = slice.reduce((s, p) => s + p.close, 0) / 125;
      momentumRaw = ((current / sma125) - 1) * 100;
    }

    // volatility: 20-day annualized realized vol
    let volRaw: number | null = null;
    if (i >= 21) {
      const recent = kospiPrices.slice(i - 20, i + 1);
      const returns: number[] = [];
      for (let j = 1; j < recent.length; j++) {
        returns.push(Math.log(recent[j].close / recent[j - 1].close));
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
      volRaw = Math.sqrt(variance) * Math.sqrt(252) * 100;
    }

    // strength: distance from 52-week high (need ~250 days)
    let strengthRaw: number | null = null;
    if (i >= 20) {
      const lookback = Math.min(i, 250);
      const windowPrices = kospiPrices.slice(i - lookback, i + 1);
      const high52w = Math.max(...windowPrices.map(p => p.close));
      const ratio = current / high52w;
      strengthRaw = 0.1 + (ratio - 0.7) / (1.0 - 0.7) * (0.9 - 0.1);
      strengthRaw = Math.max(0.1, Math.min(0.9, strengthRaw));
    }

    // Need at least momentum to compute a meaningful score
    if (momentumRaw === null) continue;

    // Normalize available signals
    const signalScores: number[] = [];

    const momNorm = normalizeSignal('momentum', momentumRaw);
    if (Number.isFinite(momNorm)) signalScores.push(momNorm);

    if (volRaw !== null) {
      const volNorm = normalizeSignal('volatility', volRaw);
      if (Number.isFinite(volNorm)) signalScores.push(volNorm);
    }

    if (strengthRaw !== null) {
      const strNorm = normalizeSignal('strength', strengthRaw);
      if (Number.isFinite(strNorm)) signalScores.push(strNorm);
    }

    if (signalScores.length === 0) continue;

    const score = Math.round(signalScores.reduce((a, b) => a + b, 0) / signalScores.length);
    const regime = classifyRegime(score);

    scores.push({ date, score, regime });
  }

  return scores;
}

// ── Exported rolling scores (used by dashboardData for history) ──

export async function getRollingScores(): Promise<HistoryPoint[]> {
  const kospiPrices = await fetchYahooPrices('^KS11', '2y');
  return computeRollingScores(kospiPrices);
}

// ── Yahoo symbol mapping ──

const ASSET_SYMBOLS: Record<ChartAsset, string> = {
  KOSPI: '^KS11',
  KOSDAQ: '^KQ11',
  BTC: 'BTC-USD',
  Gold: 'GC=F',
};

const RANGE_TRADING_DAYS: Record<TimeRange, number> = {
  '1M': 21,
  '3M': 63,
  '6M': 126,
  '1Y': 250,
};

// ── Build K-FGI vs Price chart data ──

function buildKfgiPriceSeries(
  scores: HistoryPoint[],
  assetPrices: PricePoint[],
  range: TimeRange,
): KfgiPricePoint[] {
  const days = RANGE_TRADING_DAYS[range];

  // Build date→price and date→score maps
  const priceMap = new Map<string, number>();
  for (const pt of assetPrices) {
    priceMap.set(pt.date, pt.close);
  }

  const scoreMap = new Map<string, { score: number; regime: RegimeType }>();
  for (const pt of scores) {
    scoreMap.set(pt.date, { score: pt.score, regime: pt.regime });
  }

  // Get the last N dates that have both score and price
  const validDates = scores
    .map(s => s.date)
    .filter(d => priceMap.has(d))
    .slice(-days);

  if (validDates.length === 0) return [];

  // Base price for rebasing
  const basePrice = priceMap.get(validDates[0])!;

  const result: KfgiPricePoint[] = [];
  for (const date of validDates) {
    const price = priceMap.get(date)!;
    const s = scoreMap.get(date);
    if (!s) continue;

    result.push({
      date,
      score: s.score,
      priceIndex: Math.round((price / basePrice) * 1000) / 10,
      regime: s.regime,
    });
  }

  return result;
}

// ── Exported async function ──

let _cachedData: KfgiPriceData | null = null;

export async function getKfgiPriceData(): Promise<KfgiPriceData> {
  if (_cachedData) return _cachedData;

  // Fetch KOSPI 2y for score computation + all asset prices in parallel
  const [kospiPrices, kosdaqPrices, btcPrices, goldPrices] = await Promise.all([
    fetchYahooPrices('^KS11', '2y'),
    fetchYahooPrices('^KQ11', '2y'),
    fetchYahooPrices('BTC-USD', '2y'),
    fetchYahooPrices('GC=F', '2y'),
  ]);

  // Compute rolling K-FGI scores from KOSPI data
  const scores = computeRollingScores(kospiPrices);

  // Build price data for each asset × range combination
  const assetPricesMap: Record<ChartAsset, PricePoint[]> = {
    KOSPI: kospiPrices,
    KOSDAQ: kosdaqPrices,
    BTC: btcPrices,
    Gold: goldPrices,
  };

  const data = {} as KfgiPriceData;
  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y'];
  const assets: ChartAsset[] = ['KOSPI', 'KOSDAQ', 'BTC', 'Gold'];

  for (const asset of assets) {
    data[asset] = {} as Record<TimeRange, KfgiPricePoint[]>;
    for (const range of ranges) {
      data[asset][range] = buildKfgiPriceSeries(scores, assetPricesMap[asset], range);
    }
  }

  _cachedData = data;
  return data;
}

// ── Post-signal paths (computed from historical cases) ──

export async function getPostSignalPaths(
  type: 'buy' | 'sell',
): Promise<PostSignalPathData[]> {
  // Import historical cases dynamically to avoid circular deps
  const { ALL_CASES_FOR_ANALYSIS } = await import('./historicalCases');

  const threshold = type === 'buy' ? 40 : 60;
  const cases = type === 'buy'
    ? ALL_CASES_FOR_ANALYSIS.filter(c => c.score <= threshold)
    : ALL_CASES_FOR_ANALYSIS.filter(c => c.score >= threshold);

  if (cases.length === 0) return [];

  // Group returns by asset
  const assetMap = new Map<string, { r30: number[]; r60: number[]; r90: number[] }>();

  for (const c of cases) {
    for (const r of c.returns) {
      if (!assetMap.has(r.asset)) {
        assetMap.set(r.asset, { r30: [], r60: [], r90: [] });
      }
      const bucket = assetMap.get(r.asset)!;
      if (r.return30d !== null) bucket.r30.push(r.return30d);
      if (r.return60d !== null) bucket.r60.push(r.return60d);
      if (r.return90d !== null) bucket.r90.push(r.return90d);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const result: PostSignalPathData[] = [];
  for (const [asset, data] of assetMap) {
    const points: PostSignalPathPoint[] = [
      { day: 0, avgReturn: 0 },
      { day: 30, avgReturn: Math.round(avg(data.r30) * 10) / 10 },
      { day: 60, avgReturn: Math.round(avg(data.r60) * 10) / 10 },
      { day: 90, avgReturn: Math.round(avg(data.r90) * 10) / 10 },
    ];
    result.push({ asset, points });
  }

  return result;
}
