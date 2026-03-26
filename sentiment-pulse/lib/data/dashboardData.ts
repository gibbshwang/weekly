import type {
  DailyIndexSnapshot,
  HistoryPoint,
  TimingAnalysis,
  HeatmapData,
  HistoricalContext,
} from '../types/kfgi';
import type { KfgiPriceData, PostSignalPathData } from '../types/charts';
import { buildSnapshot } from '../engine/composite';
import { MOCK_RAW_TODAY, MOCK_RAW_HISTORY } from '../fixtures/mockRawSignals';

// Static mock fallbacks for timing/heatmap (need long history to compute from engine)
import {
  mockBuyTiming,
  mockSellTiming,
  mockHeatmapData,
  mockContext,
} from '@/data/mockData';

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
