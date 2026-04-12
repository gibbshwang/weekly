import 'server-only';
import { searchStatutes, searchPrecedents } from './koreanLawClient';
import { claudeClient } from './claudeClient';
import { createStreamFilter } from './complianceFilter';
import type { UserSituation } from '@/types/analysis';
import type { Statute, Precedent } from '@/types/law';

export function buildUserPrompt(
  situation: UserSituation,
  statutes: Statute[],
  precedents: Precedent[],
): string {
  const parts: string[] = [];

  parts.push('## 사용자 상황');
  parts.push(`- 결혼 기간: ${situation.marriageDuration}`);
  parts.push(`- 자녀: ${situation.hasChildren ? situation.childrenInfo || '있음' : '없음'}`);
  if (situation.assetOverview) parts.push(`- 재산 개요: ${situation.assetOverview}`);
  parts.push(`- 이혼 사유: ${situation.divorceReason}`);
  if (situation.additionalContext) parts.push(`- 추가 사항: ${situation.additionalContext}`);

  if (statutes.length > 0) {
    parts.push('\n## 법제처 API 검색 결과 — 관련 법령');
    statutes.forEach((s, i) => {
      parts.push(`${i + 1}. ${s.name} (${s.category}, 시행 ${s.effectiveDate})`);
    });
  }

  if (precedents.length > 0) {
    parts.push('\n## 법제처 API 검색 결과 — 관련 판례');
    precedents.forEach((p, i) => {
      parts.push(`${i + 1}. ${p.caseNumber} (${p.date})`);
      parts.push(`   판시사항: ${p.summary}`);
    });
  }

  parts.push('\n아래 형식으로 정확히 작성해주세요. 섹션 헤더는 변경하지 마세요:');
  parts.push('\n## 쟁점 체크리스트');
  parts.push('(이혼 시 일반적으로 검토하는 쟁점을 - 기호로 체크리스트 항목으로. 개인화 결론 금지)');
  parts.push('\n## 관련 법령');
  parts.push('(위 법제처 검색 결과에서만 인용. 법령명과 조문번호 명시. 각 법령에 대해 쉬운 말 요약 포함)');
  parts.push('\n## 관련 판례');
  parts.push('(위 법제처 검색 결과에서만 인용. 사건번호와 선고일자 명시. 각 판례에 대해 쉬운 말 요약 포함)');
  parts.push('\n## 변호사에게 물어볼 질문');
  parts.push('(사용자 상황에 맞는 구체적인 질문 목록을 - 기호로)');

  return parts.join('\n');
}

function buildSearchKeywords(situation: UserSituation): string[] {
  const keywords = ['이혼'];
  if (situation.hasChildren) keywords.push('양육권', '양육비');
  if (situation.assetOverview) keywords.push('재산분할');
  if (situation.divorceReason) {
    if (/폭력|폭행|학대/.test(situation.divorceReason)) keywords.push('가정폭력');
    if (/외도|불륜|부정/.test(situation.divorceReason)) keywords.push('부정행위');
    if (/별거/.test(situation.divorceReason)) keywords.push('별거');
  }
  return keywords;
}

export function orchestrateAnalysis(situation: UserSituation): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const keywords = buildSearchKeywords(situation);

        // 법제처 API 병렬 호출 — 실패 시 빈 배열로 graceful degradation
        const [statutes, precedents] = await Promise.all([
          searchStatutes(keywords.join(' ')).catch(() => []),
          searchPrecedents(keywords).catch(() => []),
        ]);

        const userPrompt = buildUserPrompt(situation, statutes, precedents);

        const streamFilter = createStreamFilter();
        const stream = claudeClient.stream(userPrompt);
        for await (const chunk of stream) {
          const filtered = streamFilter(chunk);
          if (filtered !== null) {
            controller.enqueue(encoder.encode(filtered));
          }
        }
      } catch (err) {
        console.error('[orchestrateAnalysis] Error:', err);
        controller.enqueue(encoder.encode('\n\n[일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.]'));
      } finally {
        controller.close();
      }
    },
  });
}
