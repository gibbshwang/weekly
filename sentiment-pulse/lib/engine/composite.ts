import type { SignalKey, SignalReading, DailyIndexSnapshot } from '../types/kfgi';
import { SIGNAL_CONFIGS, SIGNAL_KEYS } from '../config/signals';
import { classifyRegime } from '../config/regime';
import { normalizeSignal } from './normalize';
import { generateSignalNote } from './noteGenerator';

/**
 * Compute composite K-FGI score from signal readings.
 * Excludes signals with NaN normalizedScore (missing data).
 */
export function calcCompositeScore(signals: SignalReading[]): number {
  const valid = signals.filter((s) => Number.isFinite(s.normalizedScore));
  if (valid.length === 0) return 50;
  const sum = valid.reduce((acc, s) => acc + s.normalizedScore, 0);
  return Math.round(sum / valid.length);
}

/**
 * Build a single SignalReading from a raw value.
 */
export function buildSignalReading(
  key: SignalKey,
  rawValue: number | null,
): SignalReading {
  const config = SIGNAL_CONFIGS[key];
  const normalizedScore = normalizeSignal(key, rawValue);
  const direction = Number.isFinite(normalizedScore)
    ? classifyRegime(normalizedScore)
    : null;
  const note = generateSignalNote(key, rawValue, normalizedScore, direction);

  return {
    key,
    label: config.label,
    labelEn: config.labelEn,
    rawValue,
    normalizedScore,
    direction,
    note,
  };
}

/**
 * Build a full DailyIndexSnapshot from raw signal values.
 */
export function buildSnapshot(
  date: string,
  rawSignals: Partial<Record<SignalKey, number | null>>,
  previousScore: number | null,
): DailyIndexSnapshot {
  const signals: SignalReading[] = SIGNAL_KEYS.map((key) => {
    const rawValue = rawSignals[key] ?? null;
    return buildSignalReading(key, rawValue);
  });

  const score = calcCompositeScore(signals);
  const regime = classifyRegime(score);
  const change = previousScore !== null ? score - previousScore : 0;

  // Extract VKOSPI raw value if available
  const vkospiRaw = rawSignals.volatility ?? null;

  return { date, score, regime, change, vkospiRaw, signals };
}
