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
import {
  SCORE_SIMILARITY_RANGE,
  SIMILAR_CASES_DISPLAY_COUNT,
  HISTORY_LOOKBACK_DAYS,
} from '../config/constants';

import { buildHistoricalContext } from './historicalCases';
import { generateCaseLabels } from '../ai/generateCaseLabels';

// Chart data functions (async, uses real Yahoo data)
import {
  getKfgiPriceData as _getKfgiPriceData,
  getPostSignalPaths as _getPostSignalPaths,
  getAutoComputedReturns,
  getRollingScores,
} from './chartData';
import type { AutoComputedCase } from './chartData';

// ── Cached rolling score stats ──
let _rollingOccurrences: number | null = null;

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
    // Take the last N trading days
    _history = allScores.slice(-HISTORY_LOOKBACK_DAYS);
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
 * Top 3 representative cases for display (StoryCards).
 * Auto-computed data + AI-generated labels.
 *
 * 1. 현재 점수 ±10점 범위에서 가장 유사한 거래일 3개 선택
 * 2. AI가 각 날짜의 시장 이벤트 label/note 생성
 * 3. KOSPI 수익률로 pricePath 보간 생성
 */
export async function getSimilarCaseReturns(): Promise<SimilarCaseWithReturns[]> {
  const snapshot = await getCurrentSnapshot();
  const allCases = await getAutoComputedReturns();

  const top3 = allCases
    .filter(c => Math.abs(c.score - snapshot.score) <= SCORE_SIMILARITY_RANGE)
    .sort((a, b) => Math.abs(a.score - snapshot.score) - Math.abs(b.score - snapshot.score))
    .slice(0, SIMILAR_CASES_DISPLAY_COUNT);

  if (top3.length === 0) return [];

  // AI label 생성 (API key 없으면 fallback)
  const labels = await generateCaseLabels(
    top3.map(c => ({ date: c.date, score: c.score }))
  );

  return top3.map((c, i) => {
    const kospi = c.returns.find(r => r.asset === 'KOSPI');
    const r30 = kospi?.return30d ?? 0;
    const r60 = kospi?.return60d ?? 0;
    const r90 = kospi?.return90d ?? 0;

    return {
      date: c.date,
      label: labels[i]?.label,
      score: c.score,
      note: labels[i]?.note ?? `K-FGI ${c.score}점`,
      returns: c.returns,
      pricePath: [
        { day: 0, avgReturn: 0 },
        { day: 15, avgReturn: Math.round(r30 / 2 * 10) / 10 },
        { day: 30, avgReturn: r30 },
        { day: 45, avgReturn: Math.round((r30 + r60) / 2 * 10) / 10 },
        { day: 60, avgReturn: r60 },
        { day: 75, avgReturn: Math.round((r60 + r90) / 2 * 10) / 10 },
        { day: 90, avgReturn: r90 },
      ],
    };
  });
}

/**
 * ALL trading days within ±10 points of current score,
 * with auto-computed forward returns from real Yahoo Finance price data.
 * Used for consensus computation across the full pool.
 *
 * 3년치 데이터에서 자동 계산하므로 수백 건의 실제 거래일 데이터를 기반으로 통계를 산출합니다.
 */
export async function getAllMatchingCaseReturns(): Promise<AutoComputedCase[]> {
  const snapshot = await getCurrentSnapshot();
  const allCases = await getAutoComputedReturns();
  return allCases
    .filter(c => Math.abs(c.score - snapshot.score) <= SCORE_SIMILARITY_RANGE)
    .sort((a, b) => Math.abs(a.score - snapshot.score) - Math.abs(b.score - snapshot.score));
}

/**
 * Count how many trading days in the rolling K-FGI history
 * fall within ±SCORE_SIMILARITY_RANGE points of the current score.
 * This uses real KOSPI-derived scores, not the 12 hand-picked events.
 */
export async function getRollingOccurrences(): Promise<number> {
  if (_rollingOccurrences !== null) return _rollingOccurrences;
  const snapshot = await getCurrentSnapshot();
  const allScores = await getRollingScores();
  _rollingOccurrences = allScores.filter(
    pt => Math.abs(pt.score - snapshot.score) <= SCORE_SIMILARITY_RANGE
  ).length;
  return _rollingOccurrences;
}

/**
 * Consensus summary across auto-computed cases.
 * Computes win rate, average returns, and headline from real price data.
 *
 * cases: AutoComputedCase[] — 자동 계산된 forward return 데이터
 * 90d return이 null인 거래일(최근 90일 이내)은 승률 계산에서 제외됩니다.
 */
export function getConsensusSummary(cases: AutoComputedCase[]): ConsensusSummary {
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
      headline: "유사 구간 데이터가 충분하지 않습니다",
    };
  }

  // Count KOSPI 90-day positive cases for win rate (only where 90d data exists)
  let winCount = 0;
  let totalWith90d = 0;
  for (const c of cases) {
    const kospi = c.returns.find(r => r.asset === 'KOSPI');
    if (kospi && kospi.return90d !== null) {
      totalWith90d++;
      if (kospi.return90d > 0) winCount++;
    }
  }
  const winRate90d = totalWith90d > 0 ? winCount / totalWith90d : 0;

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

  const headline = totalWith90d > 0
    ? `유사 구간 ${totalWith90d}개 케이스 중 ${winCount}건에서 90일 후 KOSPI 양수 수익률 (${Math.round(winRate90d * 100)}%)`
    : `유사 구간 데이터 대기 중`;

  return {
    winRate90d,
    avgReturns,
    totalCases: totalWith90d,
    headline,
  };
}
