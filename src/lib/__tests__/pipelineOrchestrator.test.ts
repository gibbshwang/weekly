import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../koreanLawClient', () => ({
  searchStatutes: vi.fn(),
  searchPrecedents: vi.fn(),
}));
vi.mock('../claudeClient', () => ({
  claudeClient: {
    stream: vi.fn(),
  },
}));
const mockFilterFn = vi.fn((text: string): string | null => text);
vi.mock('../complianceFilter', () => ({
  createStreamFilter: vi.fn(() => mockFilterFn),
}));

import { orchestrateAnalysis, buildUserPrompt } from '../pipelineOrchestrator';
import { searchStatutes, searchPrecedents } from '../koreanLawClient';
import { claudeClient } from '../claudeClient';
import { createStreamFilter } from '../complianceFilter';
import type { UserSituation } from '@/types/analysis';

const mockSituation: UserSituation = {
  marriageDuration: '10년',
  hasChildren: true,
  childrenInfo: '초등학생 2명',
  divorceReason: '성격 차이',
};

// Helper: read all chunks from a ReadableStream
async function readAllChunks(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe('buildUserPrompt', () => {
  it('includes user situation details', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('10년');
    expect(prompt).toContain('초등학생 2명');
    expect(prompt).toContain('성격 차이');
  });

  it('includes statute results when provided', () => {
    const statutes = [{ name: '민법', mst: '001', category: '법률', effectiveDate: '20240101' }];
    const prompt = buildUserPrompt(mockSituation, statutes, []);
    expect(prompt).toContain('민법');
  });

  it('includes precedent results when provided', () => {
    const precedents = [{ caseNumber: '2023다12345', date: '20231215', summary: '재산분할', ruling: '기각' }];
    const prompt = buildUserPrompt(mockSituation, [], precedents);
    expect(prompt).toContain('2023다12345');
  });

  it('includes "## 쟁점 체크리스트" section header', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('## 쟁점 체크리스트');
  });

  it('includes "## 관련 법령" section header', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('## 관련 법령');
  });

  it('includes "## 관련 판례" section header', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('## 관련 판례');
  });

  it('includes "## 변호사에게 물어볼 질문" section header', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('## 변호사에게 물어볼 질문');
  });

  it('includes format instruction to keep section headers', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('섹션 헤더는 변경하지 마세요');
  });

  it('includes instruction to cite only from law API results', () => {
    const prompt = buildUserPrompt(mockSituation, [], []);
    expect(prompt).toContain('법제처 검색 결과에서만 인용');
  });

  it('includes statute data in prompt when provided', () => {
    const statutes = [{ name: '민법', mst: '001', category: '법률', effectiveDate: '2024-01-01' }];
    const precedents = [{ caseNumber: '2023다12345', date: '2023-06-15', summary: '이혼 판결', ruling: '이혼 인용', precSeq: '1' }];
    const prompt = buildUserPrompt(mockSituation, statutes, precedents);
    expect(prompt).toContain('법제처 API 검색 결과');
    expect(prompt).toContain('민법');
    expect(prompt).toContain('2023다12345');
  });

  it('handles situation without optional fields', () => {
    const minimal: UserSituation = {
      marriageDuration: '3년',
      hasChildren: false,
      divorceReason: '별거',
    };
    const prompt = buildUserPrompt(minimal, [], []);
    expect(prompt).toContain('3년');
    expect(prompt).toContain('없음');
    expect(prompt).toContain('별거');
    expect(prompt).not.toContain('재산 개요');
  });
});

describe('orchestrateAnalysis', () => {
  beforeEach(() => {
    vi.mocked(searchStatutes).mockResolvedValue([]);
    vi.mocked(searchPrecedents).mockResolvedValue([]);
  });

  it('returns a ReadableStream', () => {
    async function* mockStream() { yield '테스트 텍스트'; }
    vi.mocked(claudeClient.stream).mockReturnValue(mockStream());

    const stream = orchestrateAnalysis(mockSituation);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('calls searchStatutes and searchPrecedents', async () => {
    async function* mockStream() { yield '완료'; }
    vi.mocked(claudeClient.stream).mockReturnValue(mockStream());

    const stream = orchestrateAnalysis(mockSituation);
    await readAllChunks(stream);

    expect(searchStatutes).toHaveBeenCalled();
    expect(searchPrecedents).toHaveBeenCalled();
  });

  it('applies compliance filter to each chunk', async () => {
    async function* mockStream() { yield '청크1'; yield '청크2'; }
    vi.mocked(claudeClient.stream).mockReturnValue(mockStream());

    const stream = orchestrateAnalysis(mockSituation);
    await readAllChunks(stream);

    expect(mockFilterFn).toHaveBeenCalledWith('청크1');
    expect(mockFilterFn).toHaveBeenCalledWith('청크2');
  });

  it('filters out blocked chunks', async () => {
    async function* mockStream() { yield '정상 텍스트'; yield '귀하의 경우 유리합니다'; yield '법령 정보'; }
    vi.mocked(claudeClient.stream).mockReturnValue(mockStream());
    mockFilterFn
      .mockImplementation((text: string): string | null => text.includes('귀하의 경우') ? null : text);

    const stream = orchestrateAnalysis(mockSituation);
    const result = await readAllChunks(stream);

    expect(result).toContain('정상 텍스트');
    expect(result).toContain('법령 정보');
    expect(result).not.toContain('귀하의 경우');
  });

  it('handles law API failure gracefully', async () => {
    vi.mocked(searchStatutes).mockRejectedValue(new Error('API timeout'));
    vi.mocked(searchPrecedents).mockRejectedValue(new Error('API timeout'));
    async function* mockStream() { yield '결과'; }
    vi.mocked(claudeClient.stream).mockReturnValue(mockStream());

    const stream = orchestrateAnalysis(mockSituation);
    const result = await readAllChunks(stream);

    // Should not throw, should contain error message or still produce output
    expect(result).toBeTruthy();
  });

  it('handles Claude streaming error', async () => {
    async function* mockStream(): AsyncGenerator<string> {
      yield '시작';
      throw new Error('Claude API error');
    }
    vi.mocked(claudeClient.stream).mockReturnValue(mockStream());

    const stream = orchestrateAnalysis(mockSituation);
    const result = await readAllChunks(stream);

    expect(result).toContain('오류');
  });
});
