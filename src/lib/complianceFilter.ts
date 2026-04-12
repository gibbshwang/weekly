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
