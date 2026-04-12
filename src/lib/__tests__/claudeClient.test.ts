import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT } from '../claudeClient';

describe('claudeClient SYSTEM_PROMPT', () => {
  it('contains no legal conclusions rule', () => {
    expect(SYSTEM_PROMPT).toContain('법적 결론을 내리지 마세요');
  });

  it('contains forbidden expression examples', () => {
    expect(SYSTEM_PROMPT).toContain('귀하의 경우');
  });

  it('contains law API sourcing rule', () => {
    expect(SYSTEM_PROMPT).toContain('법제처 API 검색 결과에서만 인용');
  });

  it('contains response format directive', () => {
    expect(SYSTEM_PROMPT).toContain('쟁점');
  });

  it('contains trailing disclaimer directive', () => {
    expect(SYSTEM_PROMPT).toContain('법률 자문이 아닙니다');
  });
});
