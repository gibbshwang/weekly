import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAnalysisStream } from '../useAnalysisStream';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/components/AuthProvider';

const mockUseAuth = vi.mocked(useAuth);

describe('useAnalysisStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets error when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    const { result } = renderHook(() => useAnalysisStream());

    await act(async () => {
      await result.current.startAnalysis({
        marriageDuration: '5년',
        hasChildren: false,
        divorceReason: '성격 차이',
      });
    });

    expect(result.current.error).toBe('인증이 필요합니다.');
  });

  it('updates sections when streaming chunks arrive', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('test-token');
    mockUseAuth.mockReturnValue({
      user: { getIdToken: mockGetIdToken } as any,
      loading: false,
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            '## 쟁점 체크리스트\n- 재산분할\n## 관련 법령\n민법 제839조'
          )
        );
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, body: stream } as Response)
    );

    const { result } = renderHook(() => useAnalysisStream());

    await act(async () => {
      await result.current.startAnalysis({
        marriageDuration: '5년',
        hasChildren: false,
        divorceReason: '성격 차이',
      });
    });

    expect(result.current.sections.issues).toContain('재산분할');
    expect(result.current.sections.statutes).toContain('민법 제839조');
  });

  it('sets error when fetch response is not ok', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('test-token');
    mockUseAuth.mockReturnValue({
      user: { getIdToken: mockGetIdToken } as any,
      loading: false,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)
    );

    const { result } = renderHook(() => useAnalysisStream());

    await act(async () => {
      await result.current.startAnalysis({
        marriageDuration: '5년',
        hasChildren: false,
        divorceReason: '성격 차이',
      });
    });

    expect(result.current.error).toBe('분석 요청에 실패했습니다.');
  });

  it('sets isStreaming to false when stream completes', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('test-token');
    mockUseAuth.mockReturnValue({
      user: { getIdToken: mockGetIdToken } as any,
      loading: false,
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('일부 텍스트'));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, body: stream } as Response)
    );

    const { result } = renderHook(() => useAnalysisStream());

    await act(async () => {
      await result.current.startAnalysis({
        marriageDuration: '5년',
        hasChildren: false,
        divorceReason: '성격 차이',
      });
    });

    expect(result.current.isStreaming).toBe(false);
  });
});
