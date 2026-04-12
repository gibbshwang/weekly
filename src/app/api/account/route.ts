import { adminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
  try {
    const { uid } = await adminAuth.verifyIdToken(authHeader.slice(7));
    await adminAuth.deleteUser(uid);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(
      JSON.stringify({ error: '삭제에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
