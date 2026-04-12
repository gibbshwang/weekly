import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    deleteUser: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        get: vi.fn(),
      })),
    })),
    batch: vi.fn(() => ({
      delete: vi.fn(),
      commit: vi.fn(),
    })),
  },
}));

import { DELETE } from '../route';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

const mockVerifyIdToken = vi.mocked(adminAuth.verifyIdToken);
const mockDeleteUser = vi.mocked(adminAuth.deleteUser);

function setupDbMock(snapshot: { empty: boolean; docs: Array<{ ref: string }> }) {
  const mockGet = vi.fn().mockResolvedValue(snapshot);
  const mockWhere = vi.fn(() => ({ get: mockGet }));
  vi.mocked(adminDb.collection).mockReturnValue({ where: mockWhere } as any);

  const mockBatchDelete = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
  vi.mocked(adminDb.batch).mockReturnValue({
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  } as any);

  return { mockGet, mockBatchDelete, mockBatchCommit };
}

describe('DELETE /api/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/account', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('인증이 필요합니다.');
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('유효하지 않은 인증 토큰입니다.');
  });

  it('returns 204 and deletes user when no sessions exist', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    mockDeleteUser.mockResolvedValue(undefined as any);
    setupDbMock({ empty: true, docs: [] });

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(204);
    expect(mockDeleteUser).toHaveBeenCalledWith('test-uid');
  });

  it('returns 500 when deleteUser fails', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    setupDbMock({ empty: true, docs: [] });
    mockDeleteUser.mockRejectedValue(new Error('delete failed'));

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('삭제에 실패했습니다.');
  });

  // --- NEW: Firestore cleanup tests ---

  it('batch deletes Firestore sessions BEFORE deleting auth user', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    const { mockBatchDelete, mockBatchCommit } = setupDbMock({
      empty: false,
      docs: [{ ref: 'ref1' }, { ref: 'ref2' }],
    });

    const callOrder: string[] = [];
    mockBatchCommit.mockImplementation(() => {
      callOrder.push('batchCommit');
      return Promise.resolve();
    });
    mockDeleteUser.mockImplementation(() => {
      callOrder.push('deleteUser');
      return Promise.resolve();
    });

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(204);
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchDelete).toHaveBeenCalledWith('ref1');
    expect(mockBatchDelete).toHaveBeenCalledWith('ref2');
    expect(mockBatchCommit).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('test-uid');
    expect(callOrder).toEqual(['batchCommit', 'deleteUser']);
  });

  it('returns 500 and skips auth deletion when Firestore batch delete fails', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    const { mockBatchCommit } = setupDbMock({
      empty: false,
      docs: [{ ref: 'ref1' }],
    });
    mockBatchCommit.mockRejectedValue(new Error('batch failed'));

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});
