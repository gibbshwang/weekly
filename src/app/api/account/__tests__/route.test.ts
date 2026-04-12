import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

import { DELETE } from '../route';
import { adminAuth } from '@/lib/firebaseAdmin';

const mockVerifyIdToken = vi.mocked(adminAuth.verifyIdToken);
const mockDeleteUser = vi.mocked(adminAuth.deleteUser);

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

  it('returns 204 and deletes user when token is valid', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
    mockDeleteUser.mockResolvedValue(undefined as any);

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(204);
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(mockDeleteUser).toHaveBeenCalledWith('test-uid');
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));

    const req = new Request('http://localhost/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid-token' },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });

  it('returns 500 when deleteUser fails', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'test-uid' } as any);
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
});
