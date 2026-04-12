import { describe, it, expect } from 'vitest';
import { parseAnalysisSections } from '../parseAnalysisStream';

describe('parseAnalysisSections', () => {
  it('parses issues and statutes from two-section input', () => {
    const input = '## 쟁점 체크리스트\n- 항목1\n- 항목2\n## 관련 법령\n법령내용';
    const result = parseAnalysisSections(input);
    expect(result.issues).toEqual(['항목1', '항목2']);
    expect(result.statutes).toBe('법령내용');
  });

  it('returns rawText for input without section headers (fallback)', () => {
    const input = '이것은 구조화되지 않은 텍스트입니다.';
    const result = parseAnalysisSections(input);
    expect(result.rawText).toBe(input);
    expect(result.issues).toEqual([]);
    expect(result.statutes).toBe('');
    expect(result.precedents).toBe('');
    expect(result.lawyerQuestions).toEqual([]);
  });

  it('parses all four sections from a complete response', () => {
    const input = [
      '## 쟁점 체크리스트',
      '- 재산분할',
      '- 양육권',
      '## 관련 법령',
      '민법 제840조 (재판상 이혼원인)',
      '## 관련 판례',
      '대법원 2023다12345 판결',
      '## 변호사에게 물어볼 질문',
      '- 재산분할 비율은?',
      '- 양육권 기준은?',
    ].join('\n');
    const result = parseAnalysisSections(input);
    expect(result.issues).toEqual(['재산분할', '양육권']);
    expect(result.statutes).toContain('민법 제840조');
    expect(result.precedents).toContain('2023다12345');
    expect(result.lawyerQuestions).toEqual(['재산분할 비율은?', '양육권 기준은?']);
  });

  it('handles partial streaming (only some sections arrived)', () => {
    const input = '## 쟁점 체크리스트\n- 항목1\n## 관련 법령\n법령 내용 진행중...';
    const result = parseAnalysisSections(input);
    expect(result.issues).toEqual(['항목1']);
    expect(result.statutes).toBe('법령 내용 진행중...');
    expect(result.precedents).toBe('');
    expect(result.lawyerQuestions).toEqual([]);
  });

  it('returns all empty fields for empty string input', () => {
    const result = parseAnalysisSections('');
    expect(result.issues).toEqual([]);
    expect(result.statutes).toBe('');
    expect(result.precedents).toBe('');
    expect(result.lawyerQuestions).toEqual([]);
    expect(result.rawText).toBe('');
  });

  it('parses numbered list format (1. item) in issues', () => {
    const input = '## 쟁점 체크리스트\n1. 재산분할\n2. 양육권\n## 관련 법령\n법령';
    const result = parseAnalysisSections(input);
    expect(result.issues).toEqual(['재산분할', '양육권']);
  });
});
