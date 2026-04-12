import type { Statute, Precedent } from './law';

/** 위저드에서 수집하는 사용자 상황 데이터 */
export interface UserSituation {
  marriageDuration: string;
  hasChildren: boolean;
  childrenInfo?: string;
  assetOverview?: string;
  divorceReason: string;
  additionalContext?: string;
}

/** 분석 결과 구조 (Claude 출력) */
export interface AnalysisResult {
  issueChecklist: string[];       // 쟁점 체크리스트
  relevantStatutes: Statute[];    // 관련 법령
  relevantPrecedents: Precedent[]; // 관련 판례
  lawyerQuestions: string[];      // 변호사에게 물어볼 질문
  disclaimer: string;             // 면책 고지
}

/** 스트리밍 청크 타입 */
export interface AnalysisStreamChunk {
  type: 'text' | 'error' | 'done';
  content: string;
}
