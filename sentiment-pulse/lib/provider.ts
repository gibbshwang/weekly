/**
 * Engine-backed data provider for the K-FGI dashboard.
 *
 * This module is the single entry-point that the UI layer should import.
 * It runs mock raw signals through the real calculation engine so the
 * dashboard consumes structurally identical data to what the production
 * pipeline will eventually produce.
 *
 * Stage 2/3 scaffold — all data still originates from lib/fixtures/mockRawSignals.
 */

import type {
  DailyIndexSnapshot,
  HistoryPoint,
  TimingAnalysis,
  HeatmapData,
  HistoricalContext,
  ForwardReturnMetric,
} from './types/kfgi';
import { buildSnapshot } from './engine';
import { MOCK_RAW_TODAY, MOCK_RAW_HISTORY } from './fixtures/mockRawSignals';

// ── Today's snapshot (engine-produced) ──────────────────────────────

function buildTodaySnapshot(): DailyIndexSnapshot {
  // Compute yesterday's score to derive `change`
  const yesterday = MOCK_RAW_HISTORY[MOCK_RAW_HISTORY.length - 2];
  const yesterdaySnapshot = buildSnapshot(yesterday.date, yesterday.signals, null);

  return buildSnapshot('2026-03-24', MOCK_RAW_TODAY, yesterdaySnapshot.score);
}

export const todaySnapshot: DailyIndexSnapshot = buildTodaySnapshot();

// ── 30-day history (engine-produced) ────────────────────────────────

function buildHistoryFromEngine(): HistoryPoint[] {
  let prevScore: number | null = null;

  return MOCK_RAW_HISTORY.map((entry) => {
    const snap = buildSnapshot(entry.date, entry.signals, prevScore);
    prevScore = snap.score;
    return { date: snap.date, score: snap.score, regime: snap.regime };
  });
}

export const historyPoints: HistoryPoint[] = buildHistoryFromEngine();

// ── Historical context ──────────────────────────────────────────────
// Scaffold: static mock. Will be replaced by actual historical DB query.

export const historicalContext: HistoricalContext = {
  percentile: 8,
  similarEvents: [
    {
      date: '2024-08-05',
      label: '엔 캐리 트레이드 청산',
      score: 21,
      regime: 'extreme_fear',
      note: '일본은행 금리 인상 후 KOSPI 급락',
    },
    {
      date: '2022-09-26',
      label: '레고랜드 사태',
      score: 19,
      regime: 'extreme_fear',
      note: '강원도 ABCP 채무불이행으로 신용경색 확산',
    },
    {
      date: '2020-03-19',
      label: '코로나 팬데믹 저점',
      score: 12,
      regime: 'extreme_fear',
      note: 'KOSPI 1,400대 붕괴, 사이드카 발동',
    },
  ],
};

// ── Forward return analysis (buy / sell timing) ─────────────────────
// Scaffold: static mock. Will be replaced by lib/analysis/forwardReturns.ts
// once historical price series are ingested.

const m = (avg: number, median: number, winRate: number): ForwardReturnMetric => ({
  avg,
  median,
  winRate,
});

export const buyTimingAnalysis: TimingAnalysis = {
  threshold: 25,
  caseCount: 14,
  assets: [
    { name: 'KOSPI', horizon7d: m(2.1, 1.8, 71), horizon30d: m(5.4, 4.9, 79), horizon90d: m(9.8, 8.6, 86), horizon180d: m(14.2, 12.1, 86) },
    { name: 'KOSDAQ', horizon7d: m(2.8, 2.2, 64), horizon30d: m(6.1, 5.3, 71), horizon90d: m(11.5, 9.8, 79), horizon180d: m(16.8, 13.4, 79) },
    { name: 'S&P 500', horizon7d: m(1.4, 1.1, 64), horizon30d: m(3.8, 3.2, 71), horizon90d: m(7.2, 6.5, 79), horizon180d: m(11.6, 10.2, 86) },
    { name: 'BTC', horizon7d: m(4.2, 3.1, 57), horizon30d: m(9.6, 7.4, 64), horizon90d: m(18.3, 14.1, 71), horizon180d: m(28.5, 21.2, 71) },
    { name: 'ETH', horizon7d: m(5.1, 3.8, 57), horizon30d: m(11.2, 8.6, 64), horizon90d: m(22.1, 16.8, 71), horizon180d: m(34.2, 25.1, 71) },
    { name: 'Gold', horizon7d: m(0.6, 0.4, 57), horizon30d: m(1.8, 1.2, 64), horizon90d: m(3.5, 2.8, 71), horizon180d: m(5.2, 4.1, 71) },
    { name: 'Oil', horizon7d: m(3.1, 2.2, 50), horizon30d: m(5.8, 4.1, 57), horizon90d: m(8.4, 6.2, 64), horizon180d: m(10.1, 7.8, 64) },
  ],
};

export const sellTimingAnalysis: TimingAnalysis = {
  threshold: 75,
  caseCount: 11,
  assets: [
    { name: 'KOSPI', horizon7d: m(-0.8, -0.5, 36), horizon30d: m(-2.1, -1.6, 27), horizon90d: m(-4.5, -3.2, 27), horizon180d: m(-1.8, 0.4, 45) },
    { name: 'KOSDAQ', horizon7d: m(-1.2, -0.9, 27), horizon30d: m(-3.4, -2.5, 27), horizon90d: m(-6.1, -4.8, 18), horizon180d: m(-3.2, -1.1, 36) },
    { name: 'S&P 500', horizon7d: m(-0.5, -0.3, 45), horizon30d: m(-1.4, -0.8, 36), horizon90d: m(-2.8, -1.5, 36), horizon180d: m(0.6, 1.2, 55) },
    { name: 'BTC', horizon7d: m(-2.1, -1.4, 36), horizon30d: m(-5.8, -4.2, 27), horizon90d: m(-9.2, -6.8, 27), horizon180d: m(-3.5, -0.8, 45) },
    { name: 'ETH', horizon7d: m(-2.8, -2.1, 27), horizon30d: m(-7.2, -5.4, 18), horizon90d: m(-12.4, -9.1, 18), horizon180d: m(-5.8, -2.4, 36) },
    { name: 'Gold', horizon7d: m(0.2, 0.1, 55), horizon30d: m(0.5, 0.3, 55), horizon90d: m(1.2, 0.8, 55), horizon180d: m(2.4, 1.8, 64) },
    { name: 'Oil', horizon7d: m(-1.4, -0.8, 36), horizon30d: m(-2.6, -1.5, 36), horizon90d: m(-3.8, -2.2, 36), horizon180d: m(-1.2, 0.5, 45) },
  ],
};

// ── Cross-asset heatmap ─────────────────────────────────────────────
// Scaffold: static mock. Shares the same data shape as TimingAnalysis
// but sliced by current regime rather than threshold events.

export const heatmapData: HeatmapData = {
  assets: ['KOSPI', 'KOSDAQ', 'S&P 500', 'BTC', 'ETH', 'Gold', 'Oil'],
  horizons: ['7D', '30D', '90D', '180D'],
  data: {
    'KOSPI': { '7D': m(1.2, 0.9, 64), '30D': m(3.8, 3.1, 71), '90D': m(7.4, 6.2, 79), '180D': m(11.8, 9.6, 79) },
    'KOSDAQ': { '7D': m(1.6, 1.2, 57), '30D': m(4.5, 3.6, 64), '90D': m(8.9, 7.1, 71), '180D': m(13.5, 10.8, 71) },
    'S&P 500': { '7D': m(0.8, 0.6, 57), '30D': m(2.4, 1.9, 64), '90D': m(5.1, 4.2, 71), '180D': m(8.9, 7.5, 79) },
    'BTC': { '7D': m(2.8, 1.9, 50), '30D': m(7.2, 5.4, 57), '90D': m(14.6, 10.8, 64), '180D': m(22.4, 16.5, 64) },
    'ETH': { '7D': m(3.4, 2.4, 50), '30D': m(8.6, 6.2, 57), '90D': m(17.8, 13.2, 64), '180D': m(27.1, 19.8, 64) },
    'Gold': { '7D': m(0.4, 0.3, 57), '30D': m(1.2, 0.9, 57), '90D': m(2.8, 2.1, 64), '180D': m(4.5, 3.6, 71) },
    'Oil': { '7D': m(1.8, 1.2, 50), '30D': m(3.9, 2.8, 50), '90D': m(6.2, 4.5, 57), '180D': m(7.8, 5.6, 57) },
  },
};
