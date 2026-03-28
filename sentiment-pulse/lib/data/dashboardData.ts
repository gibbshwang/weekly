import type {
  DailyIndexSnapshot,
  HistoryPoint,
  TimingAnalysis,
  HeatmapData,
  HistoricalContext,
} from '../types/kfgi';
import type { KfgiPriceData, PostSignalPathData } from '../types/charts';
import type { SimilarCaseWithReturns, ConsensusSummary, CaseReturn } from '../types/narrative';
import { NARRATIVE_ASSETS } from '../types/narrative';
import { buildSnapshot } from '../engine/composite';
import { MOCK_RAW_TODAY, MOCK_RAW_HISTORY } from '../fixtures/mockRawSignals';

// Static mock fallbacks for timing/heatmap (need long history to compute from engine)
import {
  mockBuyTiming,
  mockSellTiming,
  mockHeatmapData,
  mockContext,
} from '@/data/mockData';

import { mockSimilarCases } from '@/data/mockNarrativeData';

// Chart data functions
import {
  getKfgiPriceData as _getKfgiPriceData,
  getPostSignalPaths as _getPostSignalPaths,
} from './chartData';

// ── Build 30-day history from raw signals via engine ──

function buildHistory(): HistoryPoint[] {
  let prevScore: number | null = null;
  return MOCK_RAW_HISTORY.map((entry) => {
    const snapshot = buildSnapshot(entry.date, entry.signals, prevScore);
    prevScore = snapshot.score;
    return { date: snapshot.date, score: snapshot.score, regime: snapshot.regime };
  });
}

// ── Cached computations (computed once per server render) ──

let _snapshot: DailyIndexSnapshot | null = null;
let _history: HistoryPoint[] | null = null;

function getHistoryInternal(): HistoryPoint[] {
  if (!_history) {
    _history = buildHistory();
  }
  return _history;
}

export function getCurrentSnapshot(): DailyIndexSnapshot {
  if (!_snapshot) {
    const history = getHistoryInternal();
    const prevScore = history.length >= 2 ? history[history.length - 2].score : null;
    _snapshot = buildSnapshot('2026-03-24', MOCK_RAW_TODAY, prevScore);
  }
  return _snapshot;
}

export function getHistory(): HistoryPoint[] {
  return getHistoryInternal();
}

/**
 * Buy timing analysis.
 * Falls back to static mock data until we have multi-year K-FGI history.
 */
export function getBuyTiming(): TimingAnalysis {
  return mockBuyTiming;
}

/**
 * Sell timing analysis.
 * Falls back to static mock data until we have multi-year K-FGI history.
 */
export function getSellTiming(): TimingAnalysis {
  return mockSellTiming;
}

/**
 * Cross-asset heatmap.
 * Falls back to static mock data until we have multi-year K-FGI history.
 */
export function getHeatmap(): HeatmapData {
  return mockHeatmapData;
}

/**
 * Historical context with curated similar events.
 * Uses static mock events (real historical cases with labels).
 */
export function getHistoricalContext(): HistoricalContext {
  return mockContext;
}

/**
 * Precomputed K-FGI vs asset price data for Chart A.
 */
export function getChartPriceData(): KfgiPriceData {
  return _getKfgiPriceData();
}

/**
 * Post-signal price paths for Chart B mini charts.
 */
export function getPostSignalPaths(type: 'buy' | 'sell'): PostSignalPathData[] {
  return _getPostSignalPaths(type);
}

/**
 * Similar cases with per-asset forward returns.
 * Prototype: returns hardcoded mock data.
 * Production: will compute from K-FGI history + asset price series.
 */
export function getSimilarCaseReturns(): SimilarCaseWithReturns[] {
  return mockSimilarCases;
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
