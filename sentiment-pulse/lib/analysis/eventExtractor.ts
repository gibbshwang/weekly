import type { HistoryPoint, RegimeType } from '../types/kfgi';

export interface ExtractedEvent {
  date: string;
  score: number;
  regime: RegimeType;
}

/**
 * Extract dates where K-FGI crossed below/above a threshold.
 * Applies a cooldown period to avoid event clustering.
 *
 * @param history Sorted (ascending) daily history
 * @param threshold Score threshold to trigger event
 * @param direction 'below' for fear events (score <= threshold),
 *                  'above' for greed events (score >= threshold)
 * @param cooldownDays Minimum days between events (default 5)
 */
export function extractThresholdEvents(
  history: HistoryPoint[],
  threshold: number,
  direction: 'below' | 'above',
  cooldownDays: number = 5,
): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  let lastEventIdx = -cooldownDays - 1;

  for (let i = 0; i < history.length; i++) {
    const point = history[i];
    const triggered =
      direction === 'below'
        ? point.score <= threshold
        : point.score >= threshold;

    if (triggered && i - lastEventIdx > cooldownDays) {
      events.push({
        date: point.date,
        score: point.score,
        regime: point.regime,
      });
      lastEventIdx = i;
    }
  }

  return events;
}
