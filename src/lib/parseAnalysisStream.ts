export interface AnalysisSections {
  issues: string[];
  statutes: string;
  precedents: string;
  lawyerQuestions: string[];
  rawText: string;
}

const SECTION_HEADERS = [
  '## 쟁점 체크리스트',
  '## 관련 법령',
  '## 관련 판례',
  '## 변호사에게 물어볼 질문',
] as const;

function parseListItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line.length > 0);
}

export function parseAnalysisSections(text: string): AnalysisSections {
  const result: AnalysisSections = {
    issues: [],
    statutes: '',
    precedents: '',
    lawyerQuestions: [],
    rawText: text,
  };

  if (!text) return result;

  const hasAnySectionHeader = SECTION_HEADERS.some((h) => text.includes(h));
  if (!hasAnySectionHeader) return result;

  const sections = new Map<string, string>();
  let currentHeader = '';

  for (const line of text.split('\n')) {
    const matchedHeader = SECTION_HEADERS.find((h) => line.startsWith(h));
    if (matchedHeader) {
      currentHeader = matchedHeader;
      sections.set(currentHeader, '');
    } else if (currentHeader) {
      const existing = sections.get(currentHeader) || '';
      sections.set(currentHeader, existing ? `${existing}\n${line}` : line);
    }
  }

  const issuesRaw = sections.get('## 쟁점 체크리스트') || '';
  if (issuesRaw) result.issues = parseListItems(issuesRaw);

  result.statutes = (sections.get('## 관련 법령') || '').trim();
  result.precedents = (sections.get('## 관련 판례') || '').trim();

  const questionsRaw = sections.get('## 변호사에게 물어볼 질문') || '';
  if (questionsRaw) result.lawyerQuestions = parseListItems(questionsRaw);

  return result;
}
