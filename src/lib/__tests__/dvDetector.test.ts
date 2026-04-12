import { describe, it, expect } from 'vitest';
import { detectDv, DV_PATTERNS } from '../dvDetector';

describe('detectDv', () => {
  it('detects "폭력" keyword', () => {
    expect(detectDv('남편이 폭력을 행사합니다')).toBe(true);
  });

  it('returns false for non-DV reason', () => {
    expect(detectDv('성격 차이로 이혼하고 싶습니다')).toBe(false);
  });

  it('detects "학대" and "협박" keywords', () => {
    expect(detectDv('학대와 협박이 있었습니다')).toBe(true);
  });

  it('returns false for infidelity reason', () => {
    expect(detectDv('외도 때문입니다')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(detectDv('')).toBe(false);
  });

  it('detects fear-related keywords (무섭, 두렵)', () => {
    expect(detectDv('무섭고 두려워서 집을 나왔습니다')).toBe(true);
  });

  it('detects sexual violence keywords', () => {
    expect(detectDv('성폭력 피해를 당했습니다')).toBe(true);
  });

  it('exports DV_PATTERNS array', () => {
    expect(Array.isArray(DV_PATTERNS)).toBe(true);
    expect(DV_PATTERNS.length).toBeGreaterThan(0);
  });
});
