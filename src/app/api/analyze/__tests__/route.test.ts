import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-admin before importing route
vi.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}));

vi.mock('@/lib/pipelineOrchestrator', () => ({
  orchestrateAnalysis: vi.fn(() => new ReadableStream()),
}));

import { POST } from '../route';
import { adminAuth } from '@/lib/firebaseAdmin';
import { orchestrateAnalysis } from '@/lib/pipelineOrchestrator';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('/api/analyze route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no Authorization header', async () => {
    const res = await POST(makeRequest({ divorceReason: 'test' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('인증');
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(new Error('invalid'));
    const res = await POST(makeRequest({ divorceReason: 'test' }, { Authorization: 'Bearer bad-token' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('유효하지 않은');
  });

  it('returns 400 when divorceReason is missing', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({} as never);
    const res = await POST(makeRequest({ marriageDuration: '5년' }, { Authorization: 'Bearer valid' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('이혼 사유');
  });

  it('truncates input fields to MAX_FIELD_LENGTH (2000 chars)', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({} as never);
    const longText = 'a'.repeat(3000);
    await POST(makeRequest({ divorceReason: longText }, { Authorization: 'Bearer valid' }));
    const call = vi.mocked(orchestrateAnalysis).mock.calls[0][0];
    expect(call.divorceReason.length).toBe(2000);
  });

  it('returns streaming response on valid request', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({} as never);
    const res = await POST(makeRequest(
      { divorceReason: '성격 차이', marriageDuration: '5년' },
      { Authorization: 'Bearer valid' },
    ));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({} as never);
    vi.mocked(orchestrateAnalysis).mockImplementation(() => { throw new Error('boom'); });
    const res = await POST(makeRequest(
      { divorceReason: '성격 차이' },
      { Authorization: 'Bearer valid' },
    ));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('오류');
  });
});
