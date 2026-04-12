export const FORBIDDEN_PATTERNS: RegExp[] = [
  /귀하의\s*경우/,
  /귀하에게.*(적용|해당|유리)/,
  /인정됩니다/,
  /가능성이\s*(높|낮)/,
  /\d+%\s*(가능성|확률|승소)/,
  /(?:승소|패소).*(?:확률|가능성)/,
  /(?:위자료|재산분할).*\d+(?:만원|억)/,
  /(?:받으실|받을)\s*수\s*있/,
  /판결.{0,10}예상/,
];

export function applyFilter(text: string): string | null {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      console.warn('[ComplianceFilter] Blocked chunk:', text.slice(0, 100));
      return null;
    }
  }
  return text;
}

const BUFFER_SIZE = 60;

/**
 * Creates a stateful stream filter that maintains a rolling buffer
 * to detect forbidden patterns split across streaming chunks.
 */
export function createStreamFilter(): (chunk: string) => string | null {
  let buffer = '';

  return (chunk: string): string | null => {
    const combined = buffer + chunk;

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(combined)) {
        console.warn('[ComplianceFilter] Blocked chunk (cross-boundary):', combined.slice(0, 100));
        buffer = '';
        return null;
      }
    }

    // Keep the tail of the combined string as buffer for next chunk
    buffer = combined.slice(-BUFFER_SIZE);
    return chunk;
  };
}
