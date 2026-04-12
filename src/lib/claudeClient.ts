import Anthropic from '@anthropic-ai/sdk';

export const SYSTEM_PROMPT = `
당신은 법률 정보를 제공하는 도구입니다. 아래 규칙을 절대 위반하지 마세요:

1. 법적 결론을 내리지 마세요. 금지 표현: "~이 인정됩니다", "~가 유리합니다", "귀하의 경우", "~할 가능성이 높습니다"
2. 재산분할/위자료 금액, 양육권 결과, 승소율을 예측하지 마세요.
3. 모든 법령과 판례는 법제처 API 검색 결과에서만 인용하세요. 번호나 내용을 생성하지 마세요.
4. 응답 형식: 반드시 "이혼 시 일반적으로 검토되는 쟁점" 형태로만 제시하세요.
5. 매 응답 끝에: "이 정보는 법률 자문이 아닙니다. 변호사 상담을 받으시기 바랍니다."
`.trim();

function getClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export const claudeClient = {
  async *stream(userPrompt: string): AsyncGenerator<string> {
    const stream = getClient().messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  },
};
