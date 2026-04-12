import 'server-only';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: '인증이 필요합니다.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
  let uid: string;
  try {
    ({ uid } = await adminAuth.verifyIdToken(authHeader.slice(7)));
  } catch {
    return new Response(
      JSON.stringify({ error: '유효하지 않은 인증 토큰입니다.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
  try {
    const snapshot = await adminDb
      .collection('sessions')
      .where('userId', '==', uid)
      .get();
    if (!snapshot.empty) {
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch {
    return new Response(
      JSON.stringify({ error: '삭제에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
  try {
    await adminAuth.deleteUser(uid);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(
      JSON.stringify({ error: '삭제에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
