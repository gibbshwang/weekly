import { describe, it, expect } from 'vitest';
import { getScoreColor, getRegimeFromScore, REGIME_COLORS } from '@/lib/constants/regime';

describe('getScoreColor', () => {
  it('returns extreme_fear color for score 0-20', () => {
    expect(getScoreColor(0)).toBe(REGIME_COLORS.extreme_fear);
    expect(getScoreColor(20)).toBe(REGIME_COLORS.extreme_fear);
  });

  it('returns fear color for score 21-40', () => {
    expect(getScoreColor(21)).toBe(REGIME_COLORS.fear);
    expect(getScoreColor(40)).toBe(REGIME_COLORS.fear);
  });

  it('returns neutral color for score 41-60', () => {
    expect(getScoreColor(41)).toBe(REGIME_COLORS.neutral);
    expect(getScoreColor(60)).toBe(REGIME_COLORS.neutral);
  });

  it('returns greed color for score 61-80', () => {
    expect(getScoreColor(61)).toBe(REGIME_COLORS.greed);
    expect(getScoreColor(80)).toBe(REGIME_COLORS.greed);
  });

  it('returns extreme_greed color for score 81-100', () => {
    expect(getScoreColor(81)).toBe(REGIME_COLORS.extreme_greed);
    expect(getScoreColor(100)).toBe(REGIME_COLORS.extreme_greed);
  });
});

describe('getRegimeFromScore', () => {
  it('returns extreme_fear for score 0-20', () => {
    expect(getRegimeFromScore(0)).toBe('extreme_fear');
    expect(getRegimeFromScore(20)).toBe('extreme_fear');
  });

  it('returns fear for score 21-40', () => {
    expect(getRegimeFromScore(21)).toBe('fear');
    expect(getRegimeFromScore(40)).toBe('fear');
  });

  it('returns neutral for score 41-60', () => {
    expect(getRegimeFromScore(50)).toBe('neutral');
  });

  it('returns greed for score 61-80', () => {
    expect(getRegimeFromScore(70)).toBe('greed');
  });

  it('returns extreme_greed for score 81+', () => {
    expect(getRegimeFromScore(90)).toBe('extreme_greed');
  });
});
