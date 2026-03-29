import { describe, it, expect } from 'vitest';
import { getScoreColor, getRegimeFromScore, REGIME_COLORS } from '@/lib/constants/regime';

describe('getScoreColor', () => {
  it('returns extreme_fear color for score 0-24', () => {
    expect(getScoreColor(0)).toBe(REGIME_COLORS.extreme_fear);
    expect(getScoreColor(24)).toBe(REGIME_COLORS.extreme_fear);
  });

  it('returns fear color for score 25-44', () => {
    expect(getScoreColor(25)).toBe(REGIME_COLORS.fear);
    expect(getScoreColor(44)).toBe(REGIME_COLORS.fear);
  });

  it('returns neutral color for score 45-55', () => {
    expect(getScoreColor(45)).toBe(REGIME_COLORS.neutral);
    expect(getScoreColor(55)).toBe(REGIME_COLORS.neutral);
  });

  it('returns greed color for score 56-74', () => {
    expect(getScoreColor(56)).toBe(REGIME_COLORS.greed);
    expect(getScoreColor(74)).toBe(REGIME_COLORS.greed);
  });

  it('returns extreme_greed color for score 75-100', () => {
    expect(getScoreColor(75)).toBe(REGIME_COLORS.extreme_greed);
    expect(getScoreColor(100)).toBe(REGIME_COLORS.extreme_greed);
  });
});

describe('getRegimeFromScore', () => {
  it('returns extreme_fear for score 0-24', () => {
    expect(getRegimeFromScore(0)).toBe('extreme_fear');
    expect(getRegimeFromScore(24)).toBe('extreme_fear');
  });

  it('returns fear for score 25-44', () => {
    expect(getRegimeFromScore(25)).toBe('fear');
    expect(getRegimeFromScore(44)).toBe('fear');
  });

  it('returns neutral for score 45-55', () => {
    expect(getRegimeFromScore(50)).toBe('neutral');
  });

  it('returns greed for score 56-74', () => {
    expect(getRegimeFromScore(70)).toBe('greed');
  });

  it('returns extreme_greed for score 75+', () => {
    expect(getRegimeFromScore(90)).toBe('extreme_greed');
  });
});
