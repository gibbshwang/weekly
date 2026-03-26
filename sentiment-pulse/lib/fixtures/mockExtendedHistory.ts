import type { SignalKey } from '../types/kfgi';
import { MOCK_RAW_TODAY } from './mockRawSignals';

/**
 * Generate ~250 trading days of raw signal history for Chart A.
 * Extends the 30-day pattern from mockRawSignals to cover up to 1 year.
 * Uses seeded pseudo-random for reproducibility.
 */

let seed = 42;
function pseudoRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function normalRandom(): number {
  const u1 = pseudoRandom() || 0.0001;
  const u2 = pseudoRandom();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function generateExtendedHistory(
  days: number = 365,
): Array<{ date: string; signals: Record<SignalKey, number | null> }> {
  seed = 42; // reset seed for reproducibility

  const endDate = new Date('2026-03-24');
  const history: Array<{ date: string; signals: Record<SignalKey, number | null> }> = [];

  // "Neutral" starting values (~1 year ago)
  const neutral: Record<SignalKey, number> = {
    momentum: 2.0,
    strength: 0.55,
    breadth: 0.52,
    putCall: 0.90,
    safeHaven: 3.0,
    volatility: 20.0,
    credit: 70,
  };

  const today = MOCK_RAW_TODAY;

  let tradingDay = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);

    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    tradingDay++;
    const date = d.toISOString().slice(0, 10);

    // Progress 0→1 over the full period
    const t = tradingDay / 250;
    // Multi-frequency oscillation for realistic variance
    const wave1 = Math.sin(tradingDay * 0.08) * 0.25;
    const wave2 = Math.sin(tradingDay * 0.22) * 0.15;
    const noise = normalRandom() * 0.08;
    const wave = wave1 + wave2 + noise;

    history.push({
      date,
      signals: {
        momentum: clamp(lerp(neutral.momentum, today.momentum!, t) + wave * 4, -8, 8),
        strength: clamp(lerp(neutral.strength, today.strength!, t) + wave * 0.12, 0.1, 0.9),
        breadth: clamp(lerp(neutral.breadth, today.breadth!, t) + wave * 0.10, 0.3, 0.7),
        putCall: clamp(lerp(neutral.putCall, today.putCall!, t) - wave * 0.18, 0.6, 1.4),
        safeHaven: clamp(lerp(neutral.safeHaven, today.safeHaven!, t) + wave * 4, -10, 10),
        volatility: clamp(lerp(neutral.volatility, today.volatility!, t) - wave * 5, 12, 35),
        credit: clamp(lerp(neutral.credit, today.credit!, t) - wave * 18, 40, 150),
      },
    });
  }

  // Force last entry to match today's values exactly
  if (history.length > 0) {
    history[history.length - 1] = {
      date: '2026-03-24',
      signals: { ...MOCK_RAW_TODAY } as Record<SignalKey, number | null>,
    };
  }

  return history;
}

/** Cached extended history */
let _extendedHistory: ReturnType<typeof generateExtendedHistory> | null = null;

export function getExtendedHistory() {
  if (!_extendedHistory) {
    _extendedHistory = generateExtendedHistory();
  }
  return _extendedHistory;
}
