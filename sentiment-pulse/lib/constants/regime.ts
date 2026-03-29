import type { RegimeType } from '../types/kfgi';

export const REGIME_COLORS: Record<RegimeType, string> = {
  extreme_fear: "#dc2626",
  fear: "#ef4444",
  neutral: "#6b7280",
  greed: "#22c55e",
  extreme_greed: "#d97706",
};

export const REGIME_LABELS: Record<RegimeType, string> = {
  extreme_fear: "극단적 공포",
  fear: "공포",
  neutral: "중립",
  greed: "탐욕",
  extreme_greed: "극단적 탐욕",
};

export function getScoreColor(score: number): string {
  if (score <= 24) return REGIME_COLORS.extreme_fear;
  if (score <= 44) return REGIME_COLORS.fear;
  if (score <= 55) return REGIME_COLORS.neutral;
  if (score <= 74) return REGIME_COLORS.greed;
  return REGIME_COLORS.extreme_greed;
}

export function getRegimeFromScore(score: number): RegimeType {
  if (score <= 24) return 'extreme_fear';
  if (score <= 44) return 'fear';
  if (score <= 55) return 'neutral';
  if (score <= 74) return 'greed';
  return 'extreme_greed';
}
