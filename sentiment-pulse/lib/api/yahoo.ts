import { YAHOO_SYMBOLS, SIGNAL_DATA_RANGES } from '../config/constants';

interface YahooChartResult {
  timestamp: number[];
  indicators: {
    quote: Array<{
      close: (number | null)[];
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      volume: (number | null)[];
    }>;
  };
}

interface PricePoint {
  date: string;
  close: number;
  volume?: number;
  high?: number;
  low?: number;
}

/**
 * Fetch historical daily prices from Yahoo Finance.
 * Server-side only (no CORS issues).
 */
async function fetchYahooPrices(
  symbol: string,
  range: string = '1y',
): Promise<PricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 86400 }, // cache 24 hours (daily cron refresh)
  });

  if (!res.ok) {
    console.error(`Yahoo Finance fetch failed for ${symbol}: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const result: YahooChartResult = data.chart?.result?.[0];
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
      volume: quotes.volume[i] ?? undefined,
      high: quotes.high[i] ?? undefined,
      low: quotes.low[i] ?? undefined,
    });
  }

  return points;
}

/**
 * Compute momentum: (current / 125DMA - 1) × 100
 * Raw range: [-8, 8]
 */
export async function fetchMomentum(): Promise<number | null> {
  const prices = await fetchYahooPrices(YAHOO_SYMBOLS.KOSPI, SIGNAL_DATA_RANGES.momentum);
  if (prices.length < 126) return null;

  const current = prices[prices.length - 1].close;
  const sma125 =
    prices.slice(-126, -1).reduce((sum, p) => sum + p.close, 0) / 125;

  return ((current / sma125) - 1) * 100;
}

/**
 * Compute safe haven demand: KOSPI 20d return − bond ETF 20d return
 * Raw range: [-10, 10]
 */
export async function fetchSafeHaven(): Promise<number | null> {
  const [kospi, bond] = await Promise.all([
    fetchYahooPrices(YAHOO_SYMBOLS.KOSPI, SIGNAL_DATA_RANGES.safeHaven),
    fetchYahooPrices(YAHOO_SYMBOLS.GovtBond, SIGNAL_DATA_RANGES.safeHaven),
  ]);

  if (kospi.length < 21 || bond.length < 21) return null;

  const kospiReturn =
    ((kospi[kospi.length - 1].close / kospi[kospi.length - 21].close) - 1) * 100;
  const bondReturn =
    ((bond[bond.length - 1].close / bond[bond.length - 21].close) - 1) * 100;

  return kospiReturn - bondReturn;
}

/**
 * Compute realized volatility as VKOSPI proxy.
 * 20-day annualized standard deviation of KOSPI daily returns.
 * Raw range: [12, 35] (matches VKOSPI normalization range)
 */
export async function fetchVolatilityProxy(): Promise<number | null> {
  const prices = await fetchYahooPrices(YAHOO_SYMBOLS.KOSPI, SIGNAL_DATA_RANGES.volatility);
  if (prices.length < 22) return null;

  const recent = prices.slice(-21);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push(Math.log(recent[i].close / recent[i - 1].close));
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;

  return annualizedVol;
}

/**
 * Stock strength proxy: KOSPI distance from 52-week high.
 * (current / 52wk high) mapped to raw range [0.1, 0.9].
 * Near 52-week high → high strength (0.9). Far below → low strength (0.1).
 */
export async function fetchStrengthProxy(): Promise<number | null> {
  const prices = await fetchYahooPrices(YAHOO_SYMBOLS.KOSPI, SIGNAL_DATA_RANGES.strength);
  if (prices.length < 20) return null;

  const current = prices[prices.length - 1].close;
  const high52w = Math.max(...prices.map(p => p.close));

  // ratio: 0.0 (at low) to 1.0 (at 52w high)
  const ratio = current / high52w;

  // Map [0.7, 1.0] → [0.1, 0.9] (KOSPI rarely drops >30% from peak)
  const mapped = 0.1 + (ratio - 0.7) / (1.0 - 0.7) * (0.9 - 0.1);
  return Math.max(0.1, Math.min(0.9, mapped));
}

/**
 * Market breadth proxy: KOSDAQ vs KOSPI 20-day relative performance.
 * When small caps outperform, breadth is healthy (more stocks participating).
 * Raw range: [0.3, 0.7] (maps to breadth normalization range).
 *
 * KOSDAQ outperformance → high breadth (0.7)
 * KOSDAQ underperformance → low breadth (0.3)
 */
export async function fetchBreadthProxy(): Promise<number | null> {
  const [kospi, kosdaq] = await Promise.all([
    fetchYahooPrices(YAHOO_SYMBOLS.KOSPI, SIGNAL_DATA_RANGES.breadth),
    fetchYahooPrices(YAHOO_SYMBOLS.KOSDAQ, SIGNAL_DATA_RANGES.breadth),
  ]);

  if (kospi.length < 21 || kosdaq.length < 21) return null;

  const kospiRet =
    (kospi[kospi.length - 1].close / kospi[kospi.length - 21].close - 1) * 100;
  const kosdaqRet =
    (kosdaq[kosdaq.length - 1].close / kosdaq[kosdaq.length - 21].close - 1) * 100;

  // Relative performance: positive = KOSDAQ outperforming
  const relPerf = kosdaqRet - kospiRet;

  // Map [-5, +5] → [0.3, 0.7]
  const mapped = 0.5 + (relPerf / 5) * 0.2;
  return Math.max(0.3, Math.min(0.7, mapped));
}

/**
 * Put/call ratio proxy: Inverse ETF volume / Regular ETF volume.
 * High inverse volume relative to regular = bearish sentiment (high put/call).
 *
 * KODEX 인버스 (114800.KS) vs KODEX 200 (069500.KS)
 * Raw range: [0.6, 1.4] (maps to putCall normalization range).
 */
export async function fetchPutCallProxy(): Promise<number | null> {
  const [regular, inverse] = await Promise.all([
    fetchYahooPrices(YAHOO_SYMBOLS.KODEX200, SIGNAL_DATA_RANGES.putCall),
    fetchYahooPrices(YAHOO_SYMBOLS.KODEXInverse, SIGNAL_DATA_RANGES.putCall),
  ]);

  if (regular.length < 5 || inverse.length < 5) return null;

  // Average volume over last 5 days for stability
  const avgVol = (points: PricePoint[], n: number) => {
    const recent = points.slice(-n);
    const vols = recent.map(p => p.volume ?? 0).filter(v => v > 0);
    return vols.length > 0 ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
  };

  const regVol = avgVol(regular, 5);
  const invVol = avgVol(inverse, 5);

  if (regVol === 0) return null;

  // Volume ratio: typically 0.05~0.5, map to [0.6, 1.4]
  const ratio = invVol / regVol;
  // Map [0.05, 0.50] → [0.6, 1.4]
  const mapped = 0.6 + (ratio - 0.05) / (0.50 - 0.05) * (1.4 - 0.6);
  return Math.max(0.6, Math.min(1.4, mapped));
}

/**
 * Credit spread proxy: Corporate bond ETF vs Government bond ETF return gap.
 * When credit spreads widen (fear), corporate bonds underperform government bonds.
 *
 * KODEX 종합채권(AA-이상)액티브 (411060.KS) vs KODEX 국고채3년 (148070.KS)
 * Raw range: [40, 150] bps (maps to credit normalization range).
 */
export async function fetchCreditProxy(): Promise<number | null> {
  const [corp, govt] = await Promise.all([
    fetchYahooPrices(YAHOO_SYMBOLS.CorpBond, SIGNAL_DATA_RANGES.credit),
    fetchYahooPrices(YAHOO_SYMBOLS.GovtBond, SIGNAL_DATA_RANGES.credit),
  ]);

  if (corp.length < 60 || govt.length < 60) return null;

  // 60-day return difference as spread proxy
  const corpRet =
    (corp[corp.length - 1].close / corp[corp.length - 60].close - 1) * 100;
  const govtRet =
    (govt[govt.length - 1].close / govt[govt.length - 60].close - 1) * 100;

  // When corp underperforms govt, spread is widening (fear)
  // Difference typically ranges from -1% to +1%
  const diff = govtRet - corpRet;

  // Map [-0.5, 1.5] → [40, 150] bps
  const mapped = 40 + (diff - (-0.5)) / (1.5 - (-0.5)) * (150 - 40);
  return Math.max(40, Math.min(150, mapped));
}
