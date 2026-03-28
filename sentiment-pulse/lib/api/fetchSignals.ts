import type { SignalKey } from '../types/kfgi';
import {
  fetchMomentum,
  fetchSafeHaven,
  fetchVolatilityProxy,
  fetchStrengthProxy,
  fetchBreadthProxy,
  fetchPutCallProxy,
  fetchCreditProxy,
} from './yahoo';
import { MOCK_RAW_TODAY } from '../fixtures/mockRawSignals';

/**
 * Fetch all 7 K-FGI signal raw values from Yahoo Finance.
 *
 * All signals use Yahoo Finance data (no API keys needed):
 *   - momentum: KOSPI vs 125DMA
 *   - safeHaven: KOSPI vs bond ETF 20d returns
 *   - volatility: 20-day realized vol (VKOSPI proxy)
 *   - strength: KOSPI distance from 52-week high
 *   - breadth: KOSDAQ vs KOSPI relative performance
 *   - putCall: inverse ETF vs regular ETF volume ratio
 *   - credit: corporate bond ETF vs government bond ETF spread
 *
 * Any signal returning null falls back to mock data.
 */
export async function fetchAllSignals(): Promise<Record<SignalKey, number | null>> {
  const [momentum, safeHaven, volatility, strength, breadth, putCall, credit] =
    await Promise.all([
      fetchMomentum().catch(() => null),
      fetchSafeHaven().catch(() => null),
      fetchVolatilityProxy().catch(() => null),
      fetchStrengthProxy().catch(() => null),
      fetchBreadthProxy().catch(() => null),
      fetchPutCallProxy().catch(() => null),
      fetchCreditProxy().catch(() => null),
    ]);

  return {
    momentum: momentum ?? MOCK_RAW_TODAY.momentum,
    strength: strength ?? MOCK_RAW_TODAY.strength,
    breadth: breadth ?? MOCK_RAW_TODAY.breadth,
    putCall: putCall ?? MOCK_RAW_TODAY.putCall,
    safeHaven: safeHaven ?? MOCK_RAW_TODAY.safeHaven,
    volatility: volatility ?? MOCK_RAW_TODAY.volatility,
    credit: credit ?? MOCK_RAW_TODAY.credit,
  };
}

/**
 * Returns which signals are live vs using mock fallback.
 */
export async function fetchSignalsWithStatus(): Promise<{
  signals: Record<SignalKey, number | null>;
  live: SignalKey[];
  mock: SignalKey[];
}> {
  const [momentum, safeHaven, volatility, strength, breadth, putCall, credit] =
    await Promise.all([
      fetchMomentum().catch(() => null),
      fetchSafeHaven().catch(() => null),
      fetchVolatilityProxy().catch(() => null),
      fetchStrengthProxy().catch(() => null),
      fetchBreadthProxy().catch(() => null),
      fetchPutCallProxy().catch(() => null),
      fetchCreditProxy().catch(() => null),
    ]);

  const results: Record<SignalKey, number | null> = {
    momentum: momentum ?? MOCK_RAW_TODAY.momentum,
    strength: strength ?? MOCK_RAW_TODAY.strength,
    breadth: breadth ?? MOCK_RAW_TODAY.breadth,
    putCall: putCall ?? MOCK_RAW_TODAY.putCall,
    safeHaven: safeHaven ?? MOCK_RAW_TODAY.safeHaven,
    volatility: volatility ?? MOCK_RAW_TODAY.volatility,
    credit: credit ?? MOCK_RAW_TODAY.credit,
  };

  const live: SignalKey[] = [];
  const mock: SignalKey[] = [];

  const checks: [SignalKey, number | null][] = [
    ['momentum', momentum],
    ['strength', strength],
    ['breadth', breadth],
    ['putCall', putCall],
    ['safeHaven', safeHaven],
    ['volatility', volatility],
    ['credit', credit],
  ];

  for (const [key, val] of checks) {
    if (val !== null) {
      live.push(key);
    } else {
      mock.push(key);
    }
  }

  return { signals: results, live, mock };
}
