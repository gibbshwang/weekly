export const DV_PATTERNS: RegExp[] = [
  /폭력|폭행|학대|때리|맞/,
  /협박|위협|무서|무섭|두렵|두려/,
  /성폭력|성추행|성희롱/,
  /가정폭력/,
];

export function detectDv(text: string): boolean {
  return DV_PATTERNS.some((pattern) => pattern.test(text));
}
