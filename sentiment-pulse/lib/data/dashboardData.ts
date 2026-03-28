import type {
  SignalKey,
  DailyIndexSnapshot,
  HistoryPoint,
  HistoricalContext,
} from '../types/kfgi';
import type { KfgiPriceData, PostSignalPathData } from '../types/charts';
import type { SimilarCaseWithReturns, ConsensusSummary, CaseReturn } from '../types/narrative';
import { NARRATIVE_ASSETS } from '../types/narrative';
import { buildSnapshot } from '../engine/composite';
import { fetchSignalsWithStatus } from '../api/fetchSignals';

import { findSimilarCases, buildHistoricalContext } from './historicalCases';

// Chart data functions (async, uses real Yahoo data)
import {
  getKfgiPriceData as _getKfgiPriceData,
  getPostSignalPaths as _getPostSignalPaths,
  getRollingScores,
} from './chartData';

// ── Cached computations (computed once per server render) ──

let _snapshot: DailyIndexSnapshot | null = null;
let _history: HistoryPoint[] | null = null;
let _liveSignals: SignalKey[] = [];
let _mockSignals: SignalKey[] = [];

/**
 * Get 30-day K-FGI history computed from real Yahoo Finance KOSPI data.
 */
export async function getHistory(): Promise<HistoryPoint[]> {
  if (!_history) {
    const allScores = await getRollingScores();
    // Take the last 30 trading days
    _history = allScores.slice(-30);
  }
  return _history;
}

export async function getCurrentSnapshot(): Promise<DailyIndexSnapshot> {
  if (!_snapshot) {
    // Get previous day's score from real data for change computation
    const history = await getHistory();
    const prevScore = history.length >= 2 ? history[history.length - 2].score : null;

    // Fetch live signals from APIs (with mock fallback per signal)
    const { signals, live, mock } = await fetchSignalsWithStatus();
    _liveSignals = live;
    _mockSignals = mock;

    const today = new Date().toISOString().slice(0, 10);
    _snapshot = buildSnapshot(today, signals, prevScore);
  }
  return _snapshot;
}

/**
 * Returns which signals are live vs using mock fallback.
 */
export function getSignalSources(): { live: SignalKey[]; mock: SignalKey[] } {
  return { live: _liveSignals, mock: _mockSignals };
}

/**
 * Historical context computed dynamically from current score.
 * Finds similar historical events and computes percentile.
 */
export async function getHistoricalContext(): Promise<HistoricalContext> {
  const snapshot = await getCurrentSnapshot();
  return buildHistoricalContext(snapshot.score);
}

/**
 * Precomputed K-FGI vs asset price data for Chart A.
 * Fetches real data from Yahoo Finance.
 */
export async function getChartPriceData(): Promise<KfgiPriceData> {
  return _getKfgiPriceData();
}

/**
 * Post-signal price paths for Chart B mini charts.
 * Computed from historical cases data.
 */
export async function getPostSignalPaths(type: 'buy' | 'sell'): Promise<PostSignalPathData[]> {
  return _getPostSignalPaths(type);
}

/**
 * Similar cases with per-asset forward returns.
 * Dynamically selected based on current score (±15 points).
 */
export async function getSimilarCaseReturns(): Promise<SimilarCaseWithReturns[]> {
  const snapshot = await getCurrentSnapshot();
  return findSimilarCases(snapshot.score);
}

/**
 * Consensus summary across similar cases.
 * Computes win rate, average returns, and headline from case data.
 */
export function getConsensusSummary(cases: SimilarCaseWithReturns[]): ConsensusSummary {
  if (cases.length === 0) {
    return {
      winRate90d: 0,
      avgReturns: NARRATIVE_ASSETS.map(asset => ({
        asset,
        return30d: null,
        return60d: null,
        return90d: null,
      })),
      totalCases: 0,
      headline: "유사 사례가 충분하지 않습니다",
    };
  }

  // Count KOSPI 90-day positive cases for win rate
  let winCount = 0;
  for (const c of cases) {
    const kospi = c.returns.find(r => r.asset === 'KOSPI');
    if (kospi && kospi.return90d !== null && kospi.return90d > 0) {
      winCount++;
    }
  }
  const winRate90d = winCount / cases.length;

  // Compute per-asset average returns
  const avgReturns: CaseReturn[] = NARRATIVE_ASSETS.map(asset => {
    const assetReturns = cases
      .map(c => c.returns.find(r => r.asset === asset))
      .filter((r): r is CaseReturn => r !== undefined);

    if (assetReturns.length === 0) {
      return { asset, return30d: null, return60d: null, return90d: null };
    }

    const avg = (vals: (number | null)[]) => {
      const valid = vals.filter((v): v is number => v !== null);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };

    return {
      asset,
      return30d: avg(assetReturns.map(r => r.return30d)),
      return60d: avg(assetReturns.map(r => r.return60d)),
      return90d: avg(assetReturns.map(r => r.return90d)),
    };
  });

  const headline = `${cases.length}건 중 ${winCount}건에서 90일 후 KOSPI 양수 수익률`;

  return {
    winRate90d,
    avgReturns,
    totalCases: cases.length,
    headline,
  };
}
