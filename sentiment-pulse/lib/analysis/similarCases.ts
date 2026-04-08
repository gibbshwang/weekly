import type { HistoryPoint, HistoricalEvent } from '../types/kfgi';
import { SIMILAR_CASES_DISPLAY_COUNT, MIN_DAYS_BETWEEN_CASES } from '../config/constants';

/**
 * Find the N most similar historical cases to the current score.
 * Similarity = absolute score difference. Enforces minimum spacing.
 *
 * @param currentScore Today's K-FGI score
 * @param history Full sorted history
 * @param topN Number of results
 * @param minDaysApart Minimum days between returned cases (default 30)
 */
export function findSimilarCases(
  currentScore: number,
  history: HistoryPoint[],
  topN: number = SIMILAR_CASES_DISPLAY_COUNT,
  minDaysApart: number = MIN_DAYS_BETWEEN_CASES,
): HistoricalEvent[] {
  // Sort by similarity (smallest |score - currentScore| first)
  const candidates = history
    .map((h) => ({
      ...h,
      diff: Math.abs(h.score - currentScore),
    }))
    .sort((a, b) => a.diff - b.diff);

  const selected: HistoricalEvent[] = [];
  const usedDates: Date[] = [];

  for (const c of candidates) {
    if (selected.length >= topN) break;

    const cDate = new Date(c.date);
    const tooClose = usedDates.some(
      (d) => Math.abs(cDate.getTime() - d.getTime()) < minDaysApart * 86_400_000,
    );
    if (tooClose) continue;

    selected.push({
      date: c.date,
      score: c.score,
      regime: c.regime,
      note: '',
    });
    usedDates.push(cDate);
  }

  return selected;
}
