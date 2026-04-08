import type { RegimeType } from '../types/kfgi';

export interface RegimeThreshold {
  min: number;
  max: number;
  regime: RegimeType;
  label: string;
  color: string;
}

export const REGIME_THRESHOLDS: RegimeThreshold[] = [
  { min: 0, max: 24, regime: 'extreme_fear', label: '극단적 공포', color: '#dc2626' },
  { min: 25, max: 44, regime: 'fear', label: '공포', color: '#ef4444' },
  { min: 45, max: 55, regime: 'neutral', label: '중립', color: '#6b7280' },
  { min: 56, max: 74, regime: 'greed', label: '탐욕', color: '#22c55e' },
  { min: 75, max: 100, regime: 'extreme_greed', label: '극단적 탐욕', color: '#d97706' },
];

export function classifyRegime(score: number): RegimeType {
  // Clamp out-of-range scores to nearest boundary
  const clamped = Math.max(0, Math.min(100, score));
  for (const t of REGIME_THRESHOLDS) {
    if (clamped >= t.min && clamped <= t.max) return t.regime;
  }
  return clamped < 0 ? 'extreme_fear' : 'extreme_greed';
}
