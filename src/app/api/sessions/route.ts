import 'server-only';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const { sessionId, wizardSituation, analysisResult, pipaConsentedAt } = body;

  if (!sessionId || !analysisResult) {
    return new Response(
      JSON.stringify({ error: '필수 데이터가 누락되었습니다.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const sessionRef = adminDb.collection('sessions').doc(sessionId);
  const existing = await sessionRef.get();

  if (existing.exists) {
    if (existing.data()?.userId === uid) {
      return new Response(
        JSON.stringify({ message: '이미 저장된 세션입니다.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({ error: '세션 ID가 이미 사용 중입니다.' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  await sessionRef.set({
    userId: uid,
    createdAt: Date.now(),
    pipaConsentedAt,
    wizardSituation,
    analysisResult,
  });

  return new Response(
    JSON.stringify({ sessionId }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  );
}
