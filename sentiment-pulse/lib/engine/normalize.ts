import type { SignalKey } from '../types/kfgi';
import { SIGNAL_CONFIGS } from '../config/signals';

/**
 * Normalize a raw signal value to 0–100.
 * Returns NaN if rawValue is null or non-finite.
 */
export function normalizeSignal(key: SignalKey, rawValue: number | null): number {
  if (rawValue === null || !Number.isFinite(rawValue)) {
    return NaN;
  }

  const config = SIGNAL_CONFIGS[key];
  const [min, max] = config.rawRange;

  // Linear interpolation: [min, max] → [0, 1]
  let ratio = (rawValue - min) / (max - min);
  ratio = Math.max(0, Math.min(1, ratio)); // clamp

  if (config.inverted) {
    ratio = 1 - ratio;
  }

  return Math.round(ratio * 100);
}
