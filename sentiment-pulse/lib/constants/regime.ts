/**
 * Regime helpers — delegates to the single source of truth in lib/config/regime.ts.
 */
import type { RegimeType } from '../types/kfgi';
import { REGIME_THRESHOLDS, classifyRegime } from '../config/regime';

export const REGIME_COLORS: Record<RegimeType, string> = Object.fromEntries(
  REGIME_THRESHOLDS.map(t => [t.regime, t.color]),
) as Record<RegimeType, string>;

export const REGIME_LABELS: Record<RegimeType, string> = Object.fromEntries(
  REGIME_THRESHOLDS.map(t => [t.regime, t.label]),
) as Record<RegimeType, string>;

export function getScoreColor(score: number): string {
  const regime = classifyRegime(score);
  return REGIME_COLORS[regime];
}

export function getRegimeFromScore(score: number): RegimeType {
  return classifyRegime(score);
}
