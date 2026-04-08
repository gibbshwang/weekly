import Anthropic from '@anthropic-ai/sdk';

interface CaseLabelInput {
  date: string;
  score: number;
}

interface CaseLabel {
  date: string;
  label: string;
  note: string;
}

/**
 * AI를 사용해 유사 구간 대표 케이스의 label과 note를 생성합니다.
 * 한 번의 API 호출로 최대 5개 날짜를 처리합니다.
 *
 * ANTHROPIC_API_KEY가 없으면 날짜 기반 기본 라벨을 반환합니다.
 */
export async function generateCaseLabels(cases: CaseLabelInput[]): Promise<CaseLabel[]> {
  if (!process.env.ANTHROPIC_API_KEY || cases.length === 0) {
    return cases.map(c => fallbackLabel(c));
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const dateList = cases.map(c =>
      `- ${c.date} (K-FGI 점수: ${c.score}/100, ${describeRegime(c.score)})`
    ).join('\n');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `한국 주식시장의 특정 날짜들에 대해 그 시기의 시장 상황을 요약해주세요.
각 날짜의 K-FGI(Fear & Greed Index) 점수가 주어집니다. 0=극단적 공포, 100=극단적 탐욕.

날짜 목록:
${dateList}

각 날짜에 대해:
- label: 그 시기의 핵심 시장 이벤트를 10자 이내 한국어로 (예: "코로나 팬데믹 저점", "엔 캐리 청산")
- note: 시장 상황을 30자 이내 한국어로 (예: "KOSPI 1,400대 붕괴, 사이드카 발동")

특별한 이벤트가 없는 날이면 그 시기의 시장 분위기를 요약해주세요 (예: "반도체 업종 조정기", "외국인 매도 지속").

반드시 아래 JSON 배열 형식으로만 응답하세요:
[{"date":"YYYY-MM-DD","label":"...","note":"..."},...]`
      }],
    });

    let text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Strip markdown code fences (```json ... ```)
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    const parsed = JSON.parse(text);

    // Validate: must be an array with correct length
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cases.map(c => fallbackLabel(c));
    }

    // Validate and merge with input dates
    return cases.map(c => {
      // Normalize date comparison (YYYY-MM-DD)
      const match = parsed.find((p: CaseLabel) =>
        p.date?.slice(0, 10) === c.date.slice(0, 10)
      );
      if (
        match &&
        typeof match.label === 'string' && match.label.length > 0 && match.label.length <= 30 &&
        typeof match.note === 'string' && match.note.length > 0 && match.note.length <= 80
      ) {
        return { date: c.date, label: match.label, note: match.note };
      }
      return fallbackLabel(c);
    });
  } catch {
    return cases.map(c => fallbackLabel(c));
  }
}

function describeRegime(score: number): string {
  if (score <= 24) return '극단적 공포';
  if (score <= 44) return '공포';
  if (score <= 55) return '중립';
  if (score <= 74) return '탐욕';
  return '극단적 탐욕';
}

function fallbackLabel(c: CaseLabelInput): CaseLabel {
  const regime = describeRegime(c.score);
  const [y, m] = c.date.split('-');
  return {
    date: c.date,
    label: `${y}년 ${parseInt(m)}월 ${regime} 구간`,
    note: `K-FGI ${c.score}점, ${regime} 국면`,
  };
}
