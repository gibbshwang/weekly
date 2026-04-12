import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSet = vi.fn();
const mockGet = vi.fn();

vi.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: mockSet,
        get: mockGet,
      })),
    })),
  },
}));

import { POST } from '../route';
import { adminAuth } from '@/lib/firebaseAdmin';

const mockVerifyIdToken = vi.mocked(adminAuth.verifyIdToken);

function makeRequest(body: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request('http://localhost/api/sessions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validBody = {
  sessionId: 'test-session-1',
  wizardSituation: { divorceReason: '성격차이' },
  analysisResult: { issues: ['양육권'], statutes: '', precedents: '', lawyerQuestions: [], rawText: '' },
  pipaConsentedAt: 1712900000000,
};

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest(validBody);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid'));
    const req = makeRequest(validBody, 'bad-token');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when sessionId is missing', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    const { sessionId, ...bodyWithout } = validBody;
    const req = makeRequest(bodyWithout, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when analysisResult is missing', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    const { analysisResult, ...bodyWithout } = validBody;
    const req = makeRequest(bodyWithout, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 201 and writes to Firestore on valid request', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);

    const req = makeRequest(validBody, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'test-uid',
        wizardSituation: validBody.wizardSituation,
        analysisResult: validBody.analysisResult,
        pipaConsentedAt: validBody.pipaConsentedAt,
      }),
    );
  });

  it('returns 409 when session exists with different userId', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-B' } as any);
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'user-A' }),
    });

    const req = makeRequest(validBody, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('returns 200 without re-writing when session already exists with same userId', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'test-uid' }),
    });

    const req = makeRequest(validBody, 'valid-token');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
