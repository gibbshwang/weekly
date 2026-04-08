import type { HistoryPoint, SignalKey, RegimeType } from '../types/kfgi';
import type {
  ChartAsset,
  TimeRange,
  KfgiPricePoint,
  KfgiPriceData,
  PostSignalPathData,
  PostSignalPathPoint,
} from '../types/charts';
import type { CaseReturn, NarrativeAsset } from '../types/narrative';
import { NARRATIVE_ASSETS } from '../types/narrative';
import { normalizeSignal } from '../engine/normalize';
import { classifyRegime } from '../config/regime';
import {
  BUY_THRESHOLD,
  SELL_THRESHOLD,
  FORWARD_PRICE_SEARCH_DAYS,
  YAHOO_SYMBOLS,
  RANGE_TRADING_DAYS as RANGE_DAYS_CONFIG,
} from '../config/constants';
import { fetchYahooPrices } from '../api/yahoo';

interface PricePoint {
  date: string;
  close: number;
  volume?: number;
}

// ── Compute rolling K-FGI scores from all market data ──

interface AllPriceSeries {
  kospi: PricePoint[];
  kosdaq: PricePoint[];
  kodex200: PricePoint[];
  kodexInverse: PricePoint[];
  govtBond: PricePoint[];
  corpBond: PricePoint[];
}

/**
 * Build a date→index map for quick lookups in a price series.
 */
function buildDateIndex(prices: PricePoint[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < prices.length; i++) {
    map.set(prices[i].date, i);
  }
  return map;
}

function computeRollingScores(allPrices: AllPriceSeries): HistoryPoint[] {
  const { kospi, kosdaq, kodex200, kodexInverse, govtBond, corpBond } = allPrices;
  const scores: HistoryPoint[] = [];

  // Build date→index maps for secondary series
  const kosdaqIdx = buildDateIndex(kosdaq);
  const kodex200Idx = buildDateIndex(kodex200);
  const kodexInvIdx = buildDateIndex(kodexInverse);
  const govtBondIdx = buildDateIndex(govtBond);
  const corpBondIdx = buildDateIndex(corpBond);

  for (let i = 0; i < kospi.length; i++) {
    const current = kospi[i].close;
    const date = kospi[i].date;

    // 1. momentum: current / 125DMA - 1 * 100
    let momentumRaw: number | null = null;
    if (i >= 125) {
      const slice = kospi.slice(i - 125, i);
      const sma125 = slice.reduce((s, p) => s + p.close, 0) / 125;
      momentumRaw = ((current / sma125) - 1) * 100;
    }

    // 2. volatility: 20-day annualized realized vol
    let volRaw: number | null = null;
    if (i >= 21) {
      const recent = kospi.slice(i - 20, i + 1);
      const returns: number[] = [];
      for (let j = 1; j < recent.length; j++) {
        returns.push(Math.log(recent[j].close / recent[j - 1].close));
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
      volRaw = Math.sqrt(variance) * Math.sqrt(252) * 100;
    }

    // 3. strength: distance from 52-week high (min 125 days for meaningful lookback)
    let strengthRaw: number | null = null;
    if (i >= 125) {
      const lookback = Math.min(i, 250);
      const windowPrices = kospi.slice(i - lookback, i + 1);
      const high52w = windowPrices.reduce((max, p) => p.close > max ? p.close : max, -Infinity);
      const ratio = current / high52w;
      strengthRaw = 0.1 + (ratio - 0.7) / (1.0 - 0.7) * (0.9 - 0.1);
      strengthRaw = Math.max(0.1, Math.min(0.9, strengthRaw));
    }

    // 4. breadth: KOSDAQ vs KOSPI 20-day relative performance
    let breadthRaw: number | null = null;
    const kosdaqI = kosdaqIdx.get(date);
    if (kosdaqI !== undefined && kosdaqI >= 20 && i >= 20) {
      const kospiRet = (kospi[i].close / kospi[i - 20].close - 1) * 100;
      const kosdaqRet = (kosdaq[kosdaqI].close / kosdaq[kosdaqI - 20].close - 1) * 100;
      const relPerf = kosdaqRet - kospiRet;
      breadthRaw = 0.5 + (relPerf / 5) * 0.2;
      breadthRaw = Math.max(0.3, Math.min(0.7, breadthRaw));
    }

    // 5. putCall: KODEX Inverse volume / KODEX 200 volume (5-day avg)
    let putCallRaw: number | null = null;
    const k200I = kodex200Idx.get(date);
    const kInvI = kodexInvIdx.get(date);
    if (k200I !== undefined && kInvI !== undefined && k200I >= 4 && kInvI >= 4) {
      const avgVol = (prices: PricePoint[], endIdx: number, n: number) => {
        const slice = prices.slice(Math.max(0, endIdx - n + 1), endIdx + 1);
        const vols = slice.map(p => p.volume ?? 0).filter(v => v > 0);
        return vols.length > 0 ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
      };
      const regVol = avgVol(kodex200, k200I, 5);
      const invVol = avgVol(kodexInverse, kInvI, 5);
      if (regVol > 0) {
        const ratio = invVol / regVol;
        putCallRaw = 0.6 + (ratio - 0.05) / (0.50 - 0.05) * (1.4 - 0.6);
        putCallRaw = Math.max(0.6, Math.min(1.4, putCallRaw));
      }
    }

    // 6. safeHaven: KOSPI 20d return - Bond ETF 20d return
    let safeHavenRaw: number | null = null;
    const govtI = govtBondIdx.get(date);
    if (govtI !== undefined && govtI >= 20 && i >= 20) {
      const kospiRet = (kospi[i].close / kospi[i - 20].close - 1) * 100;
      const bondRet = (govtBond[govtI].close / govtBond[govtI - 20].close - 1) * 100;
      safeHavenRaw = kospiRet - bondRet;
    }

    // 7. credit: govt bond 60d return - corp bond 60d return
    let creditRaw: number | null = null;
    const govtI2 = govtBondIdx.get(date);
    const corpI = corpBondIdx.get(date);
    if (govtI2 !== undefined && corpI !== undefined && govtI2 >= 60 && corpI >= 60) {
      const govtRet = (govtBond[govtI2].close / govtBond[govtI2 - 60].close - 1) * 100;
      const corpRet = (corpBond[corpI].close / corpBond[corpI - 60].close - 1) * 100;
      const diff = govtRet - corpRet;
      creditRaw = 40 + (diff - (-0.5)) / (1.5 - (-0.5)) * (150 - 40);
      creditRaw = Math.max(40, Math.min(150, creditRaw));
    }

    // Require all 7 signals to be available for a fair comparison
    // with the current snapshot (which always uses all 7 signals).
    // Days with fewer signals produce systematically different scores,
    // biasing the percentile calculation.
    if (
      momentumRaw === null ||
      volRaw === null ||
      strengthRaw === null ||
      breadthRaw === null ||
      putCallRaw === null ||
      safeHavenRaw === null ||
      creditRaw === null
    ) continue;

    // Normalize all 7 signals
    const signalScores: number[] = [
      normalizeSignal('momentum', momentumRaw),
      normalizeSignal('volatility', volRaw),
      normalizeSignal('strength', strengthRaw),
      normalizeSignal('breadth', breadthRaw),
      normalizeSignal('putCall', putCallRaw),
      normalizeSignal('safeHaven', safeHavenRaw),
      normalizeSignal('credit', creditRaw),
    ].filter(Number.isFinite);

    if (signalScores.length < 7) continue;

    const score = Math.round(signalScores.reduce((a, b) => a + b, 0) / signalScores.length);
    const regime = classifyRegime(score);

    scores.push({ date, score, regime });
  }

  return scores;
}

// ── Shared raw price cache ──

interface RawAssetPrices {
  KOSPI: PricePoint[];
  KOSDAQ: PricePoint[];
  BTC: PricePoint[];
  Gold: PricePoint[];
  KODEX200: PricePoint[];
  KODEXInverse: PricePoint[];
  GovtBond: PricePoint[];
  CorpBond: PricePoint[];
}

let _rawPricesPromise: Promise<RawAssetPrices> | null = null;
let _rollingScoresPromise: Promise<HistoryPoint[]> | null = null;

async function getRawAssetPrices(): Promise<RawAssetPrices> {
  if (!_rawPricesPromise) {
    _rawPricesPromise = Promise.all([
      fetchYahooPrices(YAHOO_SYMBOLS.KOSPI, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.KOSDAQ, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.BTC, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.Gold, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.KODEX200, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.KODEXInverse, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.GovtBond, '3y'),
      fetchYahooPrices(YAHOO_SYMBOLS.CorpBond, '3y'),
    ]).then(([KOSPI, KOSDAQ, BTC, Gold, KODEX200, KODEXInverse, GovtBond, CorpBond]) =>
      ({ KOSPI, KOSDAQ, BTC, Gold, KODEX200, KODEXInverse, GovtBond, CorpBond })
    );
  }
  return _rawPricesPromise;
}

// ── Exported rolling scores (used by dashboardData for history) ──

export async function getRollingScores(): Promise<HistoryPoint[]> {
  if (!_rollingScoresPromise) {
    _rollingScoresPromise = getRawAssetPrices().then(rawPrices =>
      computeRollingScores({
        kospi: rawPrices.KOSPI,
        kosdaq: rawPrices.KOSDAQ,
        kodex200: rawPrices.KODEX200,
        kodexInverse: rawPrices.KODEXInverse,
        govtBond: rawPrices.GovtBond,
        corpBond: rawPrices.CorpBond,
      })
    );
  }
  return _rollingScoresPromise;
}

// ── Yahoo symbol mapping (from central config) ──

const ASSET_SYMBOLS: Record<ChartAsset, string> = {
  KOSPI: YAHOO_SYMBOLS.KOSPI,
  KOSDAQ: YAHOO_SYMBOLS.KOSDAQ,
  BTC: YAHOO_SYMBOLS.BTC,
  Gold: YAHOO_SYMBOLS.Gold,
};

const RANGE_TRADING_DAYS: Record<TimeRange, number> = RANGE_DAYS_CONFIG;

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

let _kfgiPricePromise: Promise<KfgiPriceData> | null = null;

export async function getKfgiPriceData(): Promise<KfgiPriceData> {
  if (!_kfgiPricePromise) {
    _kfgiPricePromise = (async () => {
      const rawPrices = await getRawAssetPrices();
      const scores = await getRollingScores();

      const data = {} as KfgiPriceData;
      const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y'];
      const assets: ChartAsset[] = ['KOSPI', 'KOSDAQ', 'BTC', 'Gold'];

      for (const asset of assets) {
        data[asset] = {} as Record<TimeRange, KfgiPricePoint[]>;
        for (const range of ranges) {
          data[asset][range] = buildKfgiPriceSeries(scores, rawPrices[asset], range);
        }
      }
      return data;
    })();
  }
  return _kfgiPricePromise;
}

// ── Auto-computed forward returns for every trading day ──

export interface AutoComputedCase {
  date: string;
  score: number;
  returns: CaseReturn[];
}

/**
 * Find the closing price on or shortly after a target date.
 * Searches up to 5 calendar days forward to find the nearest trading day.
 */
function findForwardPrice(
  priceMap: Map<string, number>,
  baseDate: string,
  daysForward: number,
): number | null {
  const base = new Date(baseDate);
  for (let offset = 0; offset <= FORWARD_PRICE_SEARCH_DAYS; offset++) {
    const target = new Date(base);
    target.setDate(target.getDate() + daysForward + offset);
    const dateStr = target.toISOString().slice(0, 10);
    const price = priceMap.get(dateStr);
    if (price !== undefined) return price;
  }
  return null;
}

/**
 * Compute forward returns (30d/60d/90d) for every trading day
 * that has a K-FGI score, using real Yahoo Finance price data.
 *
 * Yahoo Finance 3년 데이터를 사용하므로 매일 자동으로 새 거래일이 포함됩니다.
 * 최근 90일 이내의 거래일은 90d return이 null (아직 미래 데이터 없음).
 */
let _autoReturnsPromise: Promise<AutoComputedCase[]> | null = null;

export async function getAutoComputedReturns(): Promise<AutoComputedCase[]> {
  if (!_autoReturnsPromise) {
    _autoReturnsPromise = (async () => {
      const [scores, rawPrices] = await Promise.all([
        getRollingScores(),
        getRawAssetPrices(),
      ]);

      // Build date→price maps for each asset
      const priceMaps: Record<NarrativeAsset, Map<string, number>> = {
        KOSPI: new Map(),
        KOSDAQ: new Map(),
        Gold: new Map(),
        BTC: new Map(),
      };
      for (const asset of NARRATIVE_ASSETS) {
        for (const pt of rawPrices[asset]) {
          priceMaps[asset].set(pt.date, pt.close);
        }
      }

      const cases: AutoComputedCase[] = [];

      for (const pt of scores) {
        const returns: CaseReturn[] = [];

        for (const asset of NARRATIVE_ASSETS) {
          const basePrice = priceMaps[asset].get(pt.date);
          if (!basePrice) {
            returns.push({ asset, return30d: null, return60d: null, return90d: null });
            continue;
          }

          const p30 = findForwardPrice(priceMaps[asset], pt.date, 30);
          const p60 = findForwardPrice(priceMaps[asset], pt.date, 60);
          const p90 = findForwardPrice(priceMaps[asset], pt.date, 90);

          returns.push({
            asset,
            return30d: p30 !== null ? Math.round(((p30 / basePrice) - 1) * 1000) / 10 : null,
            return60d: p60 !== null ? Math.round(((p60 / basePrice) - 1) * 1000) / 10 : null,
            return90d: p90 !== null ? Math.round(((p90 / basePrice) - 1) * 1000) / 10 : null,
          });
        }

        cases.push({ date: pt.date, score: pt.score, returns });
      }

      return cases;
    })();
  }
  return _autoReturnsPromise;
}

// ── Post-signal paths (now using auto-computed data) ──

export async function getPostSignalPaths(
  type: 'buy' | 'sell',
): Promise<PostSignalPathData[]> {
  const allCases = await getAutoComputedReturns();

  const threshold = type === 'buy' ? BUY_THRESHOLD : SELL_THRESHOLD;
  const cases = type === 'buy'
    ? allCases.filter(c => c.score <= threshold)
    : allCases.filter(c => c.score >= threshold);

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
