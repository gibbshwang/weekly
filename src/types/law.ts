/** 법령 검색 결과 단위 */
export interface Statute {
  name: string;        // 법령명한글
  mst: string;         // 법령MST (법령 고유 식별자)
  category: string;    // 법령구분명 (법률, 시행령 등)
  effectiveDate: string; // 시행일자
}

/** 판례 검색 결과 단위 */
export interface Precedent {
  caseNumber: string;  // 사건번호
  date: string;        // 선고일자
  summary: string;     // 판시사항 (HTML 스트립 후)
  ruling: string;      // 판결요지 (HTML 스트립 후)
  precSeq?: string;    // 판례일련번호 (상세 조회용)
}

/** 법령 조문 상세 */
export interface StatuteArticle {
  articleNumber: string; // 조문 번호
  articleTitle: string;  // 조문 제목
  articleContent: string; // 조문 내용 (HTML 스트립 후)
}

/** 법제처 API 검색 파라미터 */
export interface LawSearchParams {
  query: string;
  target: 'law' | 'prec';
  display?: number;    // 결과 수 (기본 5)
}
