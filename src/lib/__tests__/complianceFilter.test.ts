import { describe, it, expect, vi } from 'vitest';
import { applyFilter, FORBIDDEN_PATTERNS } from '../complianceFilter';

describe('complianceFilter', () => {
  it('passes safe text through unchanged', () => {
    expect(applyFilter('이혼 시 일반적으로 검토되는 쟁점입니다.')).toBe('이혼 시 일반적으로 검토되는 쟁점입니다.');
  });

  it('blocks "귀하의 경우" pattern', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(applyFilter('귀하의 경우 위자료 청구가 가능합니다.')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('blocks "귀하에게 적용" pattern', () => {
    expect(applyFilter('귀하에게 적용되는 법률은 민법 제840조입니다.')).toBeNull();
  });

  it('blocks percentage prediction pattern', () => {
    expect(applyFilter('승소할 확률은 70%입니다.')).toBeNull();
  });

  it('blocks monetary amount with legal context', () => {
    expect(applyFilter('위자료 5000만원 수준으로 예상됩니다.')).toBeNull();
  });

  it('blocks "재산분할" + amount pattern', () => {
    expect(applyFilter('재산분할 금액은 2억원 정도입니다.')).toBeNull();
  });

  it('blocks "~이 인정됩니다" legal conclusion', () => {
    expect(applyFilter('이혼 사유가 인정됩니다.')).toBeNull();
  });

  it('blocks "귀하에게 유리" legal advice', () => {
    expect(applyFilter('귀하에게 재판이혼이 유리합니다.')).toBeNull();
  });

  it('has at least 5 forbidden patterns', () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });
});
