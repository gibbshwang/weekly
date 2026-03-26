import type { SignalKey } from '../types/kfgi';

/**
 * Mock raw signal values for 2026-03-24.
 *
 * Calibrated so that after normalization they approximate
 * the existing mockData scores:
 *   momentum≈28, volatility≈35, safeHaven≈22, credit≈38,
 *   strength≈30, putCall≈42, breadth≈25
 */
export const MOCK_RAW_TODAY: Record<SignalKey, number | null> = {
  momentum: -3.5, // → normalize: (-3.5-(-8))/(8-(-8)) = 4.5/16 = 0.28 → 28
  strength: 0.34, // → (0.34-0.1)/(0.9-0.1) = 0.24/0.8 = 0.30 → 30
  breadth: 0.40, // → (0.40-0.3)/(0.7-0.3) = 0.10/0.4 = 0.25 → 25
  putCall: 1.07, // → inverted: 1 - (1.07-0.6)/(1.4-0.6) = 1 - 0.47/0.8 = 1-0.59 = 0.41 → 41
  safeHaven: -5.6, // → (-5.6-(-10))/(10-(-10)) = 4.4/20 = 0.22 → 22
  volatility: 27.0, // → inverted: 1 - (27-12)/(35-12) = 1 - 15/23 = 1-0.65 = 0.35 → 35
  credit: 108, // → inverted: 1 - (108-40)/(150-40) = 1 - 68/110 = 1-0.618 = 0.38 → 38
};

/**
 * Mock 30-day raw signal history.
 * Each day has a base pattern + random noise to create realistic variance.
 */
export const MOCK_RAW_HISTORY: Array<{
  date: string;
  signals: Record<SignalKey, number | null>;
}> = generateMockHistory();

function generateMockHistory() {
  const history: Array<{
    date: string;
    signals: Record<SignalKey, number | null>;
  }> = [];

  // Base values oscillate around "neutral" and drift toward current fear reading
  const baseDate = new Date('2026-02-23');

  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);

    // Progress factor: 0→1 over 30 days (drifts toward current fear state)
    const t = i / 29;
    // Wave: oscillates around neutral then settles into fear
    const wave = Math.sin(i * 0.4) * 0.3;

    history.push({
      date,
      signals: {
        momentum: lerp(1.0, -3.5, t) + wave * 3,
        strength: lerp(0.55, 0.34, t) + wave * 0.1,
        breadth: lerp(0.52, 0.40, t) + wave * 0.08,
        putCall: lerp(0.85, 1.07, t) - wave * 0.15,
        safeHaven: lerp(2.0, -5.6, t) + wave * 3,
        volatility: lerp(18.0, 27.0, t) - wave * 4,
        credit: lerp(62, 108, t) - wave * 15,
      },
    });
  }

  // Force last entry to match today's values
  history[29] = { date: '2026-03-24', signals: { ...MOCK_RAW_TODAY } };

  return history;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
