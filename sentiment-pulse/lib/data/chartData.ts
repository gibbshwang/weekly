import type { HistoryPoint } from '../types/kfgi';
import type {
  ChartAsset,
  TimeRange,
  KfgiPricePoint,
  KfgiPriceData,
  PostSignalPathData,
  PostSignalPathPoint,
} from '../types/charts';
import { buildSnapshot } from '../engine/composite';
import { getExtendedHistory } from '../fixtures/mockExtendedHistory';
import { MOCK_ASSET_PRICES } from '../fixtures/mockPrices';
import { mockBuyTiming, mockSellTiming } from '@/data/mockData';

// ── Extended K-FGI history (built once) ──

let _extScores: HistoryPoint[] | null = null;

function getExtendedScores(): HistoryPoint[] {
  if (_extScores) return _extScores;

  const raw = getExtendedHistory();
  const scores: HistoryPoint[] = [];
  let prevScore: number | null = null;

  for (const entry of raw) {
    const snap = buildSnapshot(entry.date, entry.signals, prevScore);
    prevScore = snap.score;
    scores.push({ date: snap.date, score: snap.score, regime: snap.regime });
  }

  _extScores = scores;
  return scores;
}

// ── Chart A: K-FGI vs Asset Price ──

const CHART_ASSETS: ChartAsset[] = ['KOSPI', 'KOSDAQ', 'BTC', 'Gold'];
const RANGE_TRADING_DAYS: Record<TimeRange, number> = {
  '1M': 21,
  '3M': 63,
  '6M': 126,
  '1Y': 250,
};

function buildKfgiPriceSeries(
  asset: ChartAsset,
  range: TimeRange,
): KfgiPricePoint[] {
  const scores = getExtendedScores();
  const priceSeries = MOCK_ASSET_PRICES.find((p) => p.asset === asset);
  if (!priceSeries) return [];

  const days = RANGE_TRADING_DAYS[range];

  // Build date→price map
  const priceMap = new Map<string, number>();
  for (const pt of priceSeries.data) {
    priceMap.set(pt.date, pt.price);
  }

  // Take last N scores that have matching price data
  const tail = scores.slice(-days);

  // Find the baseline price (first point in window)
  let basePrice: number | null = null;
  for (const pt of tail) {
    const price = priceMap.get(pt.date);
    if (price !== undefined) {
      basePrice = price;
      break;
    }
  }
  if (basePrice === null) return [];

  const result: KfgiPricePoint[] = [];
  for (const pt of tail) {
    const price = priceMap.get(pt.date);
    if (price === undefined) continue;
    result.push({
      date: pt.date,
      score: pt.score,
      priceIndex: Math.round((price / basePrice) * 1000) / 10, // 100-based index, 1 decimal
      regime: pt.regime,
    });
  }

  return result;
}

let _kfgiPriceData: KfgiPriceData | null = null;

export function getKfgiPriceData(): KfgiPriceData {
  if (_kfgiPriceData) return _kfgiPriceData;

  const data = {} as KfgiPriceData;
  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y'];

  for (const asset of CHART_ASSETS) {
    data[asset] = {} as Record<TimeRange, KfgiPricePoint[]>;
    for (const range of ranges) {
      data[asset][range] = buildKfgiPriceSeries(asset, range);
    }
  }

  _kfgiPriceData = data;
  return data;
}

// ── Chart B: Post-Signal Price Path ──

export function getPostSignalPaths(
  type: 'buy' | 'sell',
): PostSignalPathData[] {
  const timing = type === 'buy' ? mockBuyTiming : mockSellTiming;

  return timing.assets.map((asset) => {
    const points: PostSignalPathPoint[] = [
      { day: 0, avgReturn: 0 },
      { day: 7, avgReturn: asset.horizon7d.avg },
      { day: 30, avgReturn: asset.horizon30d.avg },
      { day: 90, avgReturn: asset.horizon90d.avg },
      { day: 180, avgReturn: asset.horizon180d.avg },
    ];
    return { asset: asset.name, points };
  });
}
