import { orchestrateAnalysis } from '@/lib/pipelineOrchestrator';
import type { UserSituation } from '@/types/analysis';

// INFRA-03: Node.js runtime 필수 — Anthropic SDK + fast-xml-parser + firebase-admin은 Node.js API 의존
export const runtime = 'nodejs';
// INFRA-02: Vercel Pro 최대 300s. 법제처(~1s) + Claude 스트리밍(5~15s) 고려하여 60s 설정
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 기본 입력 검증
    const situation: UserSituation = {
      marriageDuration: body.marriageDuration ?? '',
      hasChildren: Boolean(body.hasChildren),
      childrenInfo: body.childrenInfo,
      assetOverview: body.assetOverview,
      divorceReason: body.divorceReason ?? '',
      additionalContext: body.additionalContext,
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
