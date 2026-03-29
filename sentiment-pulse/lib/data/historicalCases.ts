import type { HistoricalContext, HistoryPoint } from '../types/kfgi';
import { getRollingScores } from './chartData';

/**
 * Compute historical percentile from real rolling K-FGI scores.
 * "현재 점수보다 낮았던 날이 전체의 몇 %인지" 계산.
 */
export function computePercentile(score: number, allScores: HistoryPoint[]): number {
  if (allScores.length === 0) return 50;
  const below = allScores.filter(s => s.score <= score).length;
  return Math.round((below / allScores.length) * 100);
}

/**
 * Build historical context dynamically from real Yahoo Finance data.
 * percentile은 3년치 rolling scores에서 실제 계산.
 */
export async function buildHistoricalContext(currentScore: number): Promise<HistoricalContext> {
  const allScores = await getRollingScores();
  const percentile = computePercentile(currentScore, allScores);

  return {
    percentile,
    similarEvents: [], // StoryCards에서 별도로 표시하므로 여기서는 빈 배열
  };
}
