import { describe, it, expect } from 'vitest';
import { getConsensusSummary } from '@/lib/data/dashboardData';
import type { AutoComputedCase } from '@/lib/data/chartData';

// ── getConsensusSummary ──

describe('getConsensusSummary', () => {
  it('returns fallback when cases array is empty', () => {
    const result = getConsensusSummary([]);

    expect(result.totalCases).toBe(0);
    expect(result.winRate90d).toBe(0);
    expect(result.headline).toBe('유사 구간 데이터가 충분하지 않습니다');
    expect(result.avgReturns).toHaveLength(4);
    result.avgReturns.forEach(r => {
      expect(r.return30d).toBeNull();
      expect(r.return60d).toBeNull();
      expect(r.return90d).toBeNull();
    });
  });

  it('computes win rate from KOSPI 90d returns', () => {
    const cases: AutoComputedCase[] = [
      makeCase({ kospi90d: 12.4 }),  // positive
      makeCase({ kospi90d: -2.0 }),  // negative
      makeCase({ kospi90d: 35.2 }),  // positive
    ];

    const result = getConsensusSummary(cases);

    expect(result.winRate90d).toBeCloseTo(2 / 3);
    expect(result.totalCases).toBe(3);
    expect(result.headline).toContain('2건');
  });

  it('win rate is 0 when all KOSPI 90d returns are negative', () => {
    const cases: AutoComputedCase[] = [
      makeCase({ kospi90d: -5.0 }),
      makeCase({ kospi90d: -1.2 }),
    ];

    const result = getConsensusSummary(cases);

    expect(result.winRate90d).toBe(0);
  });

  it('win rate is 1 when all KOSPI 90d returns are positive', () => {
    const cases: AutoComputedCase[] = [
      makeCase({ kospi90d: 10.0 }),
      makeCase({ kospi90d: 5.0 }),
    ];

    const result = getConsensusSummary(cases);

    expect(result.winRate90d).toBe(1);
  });

  it('excludes null KOSPI 90d from win rate denominator and totalCases', () => {
    const cases: AutoComputedCase[] = [
      makeCase({ kospi90d: null }),   // excluded from win rate calc
      makeCase({ kospi90d: 10.0 }),   // positive
    ];

    const result = getConsensusSummary(cases);

    // Only 1 case has 90d data, and it's positive → 100%
    expect(result.winRate90d).toBe(1);
    expect(result.totalCases).toBe(1); // only cases with 90d data
  });

  it('computes average returns across cases', () => {
    const cases: AutoComputedCase[] = [
      {
        date: '2024-01-01', score: 20,
        returns: [
          { asset: 'KOSPI', return30d: 10, return60d: 20, return90d: 30 },
          { asset: 'KOSDAQ', return30d: 5, return60d: 10, return90d: 15 },
          { asset: 'Gold', return30d: 2, return60d: 4, return90d: 6 },
          { asset: 'BTC', return30d: 20, return60d: 40, return90d: 60 },
        ],
      },
      {
        date: '2023-01-01', score: 18,
        returns: [
          { asset: 'KOSPI', return30d: 4, return60d: 8, return90d: 12 },
          { asset: 'KOSDAQ', return30d: 3, return60d: 6, return90d: 9 },
          { asset: 'Gold', return30d: 1, return60d: 2, return90d: 3 },
          { asset: 'BTC', return30d: 10, return60d: 20, return90d: 30 },
        ],
      },
    ];

    const result = getConsensusSummary(cases);

    const kospi = result.avgReturns.find(r => r.asset === 'KOSPI')!;
    expect(kospi.return30d).toBeCloseTo(7);   // (10+4)/2
    expect(kospi.return60d).toBeCloseTo(14);  // (20+8)/2
    expect(kospi.return90d).toBeCloseTo(21);  // (30+12)/2

    const btc = result.avgReturns.find(r => r.asset === 'BTC')!;
    expect(btc.return30d).toBeCloseTo(15);    // (20+10)/2
  });

  it('averages skip null values', () => {
    const cases: AutoComputedCase[] = [
      {
        date: '2024-01-01', score: 20,
        returns: [
          { asset: 'KOSPI', return30d: 10, return60d: null, return90d: 30 },
          { asset: 'KOSDAQ', return30d: null, return60d: null, return90d: null },
          { asset: 'Gold', return30d: 2, return60d: 4, return90d: 6 },
          { asset: 'BTC', return30d: 20, return60d: 40, return90d: 60 },
        ],
      },
      {
        date: '2023-01-01', score: 18,
        returns: [
          { asset: 'KOSPI', return30d: 4, return60d: 8, return90d: null },
          { asset: 'KOSDAQ', return30d: 3, return60d: 6, return90d: 9 },
          { asset: 'Gold', return30d: 1, return60d: 2, return90d: 3 },
          { asset: 'BTC', return30d: null, return60d: 20, return90d: 30 },
        ],
      },
    ];

    const result = getConsensusSummary(cases);

    const kospi = result.avgReturns.find(r => r.asset === 'KOSPI')!;
    expect(kospi.return30d).toBeCloseTo(7);    // (10+4)/2
    expect(kospi.return60d).toBeCloseTo(8);    // only one non-null: 8
    expect(kospi.return90d).toBeCloseTo(30);   // only one non-null: 30

    const kosdaq = result.avgReturns.find(r => r.asset === 'KOSDAQ')!;
    expect(kosdaq.return30d).toBeCloseTo(3);   // only one non-null: 3
    expect(kosdaq.return60d).toBeCloseTo(6);   // only one non-null: 6
    expect(kosdaq.return90d).toBeCloseTo(9);   // only one non-null: 9
  });

  it('returns all 4 narrative assets in avgReturns', () => {
    const cases: AutoComputedCase[] = [makeCase({ kospi90d: 10 })];
    const result = getConsensusSummary(cases);

    const assets = result.avgReturns.map(r => r.asset);
    expect(assets).toEqual(['KOSPI', 'KOSDAQ', 'Gold', 'BTC']);
  });

  it('handles single case correctly', () => {
    const single: AutoComputedCase = {
      date: '2024-08-05', score: 21,
      returns: [
        { asset: 'KOSPI', return30d: 3.2, return60d: 5.1, return90d: 12.4 },
        { asset: 'KOSDAQ', return30d: 1.8, return60d: 2.4, return90d: 8.7 },
        { asset: 'Gold', return30d: 0.5, return60d: 1.2, return90d: 2.1 },
        { asset: 'BTC', return30d: 8.4, return60d: 15.2, return90d: 28.3 },
      ],
    };

    const result = getConsensusSummary([single]);

    expect(result.totalCases).toBe(1);
    expect(result.winRate90d).toBe(1);
    const kospi = result.avgReturns.find(r => r.asset === 'KOSPI')!;
    expect(kospi.return30d).toBeCloseTo(3.2);
    expect(kospi.return90d).toBeCloseTo(12.4);
  });
});

// ── Helper ──

function makeCase(opts: { kospi90d: number | null }): AutoComputedCase {
  return {
    date: '2024-01-01',
    score: 20,
    returns: [
      { asset: 'KOSPI', return30d: 1, return60d: 2, return90d: opts.kospi90d },
      { asset: 'KOSDAQ', return30d: 1, return60d: 2, return90d: 5 },
      { asset: 'Gold', return30d: 0.5, return60d: 1, return90d: 2 },
      { asset: 'BTC', return30d: 5, return60d: 10, return90d: 15 },
    ],
  };
}
