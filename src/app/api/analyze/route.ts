import { orchestrateAnalysis } from '@/lib/pipelineOrchestrator';
import { adminAuth } from '@/lib/firebaseAdmin';
import type { UserSituation } from '@/types/analysis';

// INFRA-03: Node.js runtime 필수 — Anthropic SDK + fast-xml-parser + firebase-admin은 Node.js API 의존
export const runtime = 'nodejs';
// INFRA-02: Vercel Pro 최대 300s. 법제처(~1s) + Claude 스트리밍(5~15s) 고려하여 60s 설정
export const maxDuration = 60;

const MAX_FIELD_LENGTH = 2000;

function sanitizeInput(text: string | undefined): string {
  if (!text) return '';
  return String(text).slice(0, MAX_FIELD_LENGTH).replace(/\r/g, '');
}

export async function POST(req: Request) {
  try {
    // Fix 4: Firebase anonymous auth 토큰 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    try {
      await adminAuth.verifyIdToken(authHeader.slice(7));
    } catch {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 인증 토큰입니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();

    // Fix 2 + 5: 입력 길이 제한 + 기본 전처리
    const situation: UserSituation = {
      marriageDuration: sanitizeInput(body.marriageDuration),
      hasChildren: Boolean(body.hasChildren),
      childrenInfo: sanitizeInput(body.childrenInfo) || undefined,
      assetOverview: sanitizeInput(body.assetOverview) || undefined,
      divorceReason: sanitizeInput(body.divorceReason),
      additionalContext: sanitizeInput(body.additionalContext) || undefined,
    };

    if (!situation.divorceReason) {
      return new Response(
        JSON.stringify({ error: '이혼 사유는 필수 입력 항목입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 스트리밍 응답 즉시 반환 (Vercel 타임아웃 회피)
    const stream = orchestrateAnalysis(situation);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[/api/analyze] Error:', err);
    return new Response(
      JSON.stringify({ error: '분석 요청 처리 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
