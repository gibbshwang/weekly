import ScoreGauge from './ScoreGauge';
import { interpretations } from '@/data/interpretations';
import type { RegimeType } from '@/lib/types/kfgi';

interface HookSectionProps {
  score: number;
  regime: RegimeType;
  change: number;
  date: string;
  vkospiRaw: number | null;
  percentile: number;
  winRate90d: number;
  totalCases: number;
}

export default function HookSection({
  score,
  regime,
  change,
  date,
  vkospiRaw,
  percentile,
  winRate90d,
  totalCases,
}: HookSectionProps) {
  const info = interpretations[regime];
  const winPct = Math.round(winRate90d * 100);

  return (
    <section>
      {/* Date stamp */}
      <p
        className="font-mono text-[11px] tracking-[0.08em] uppercase mb-4"
        style={{ color: 'var(--text-3)' }}
      >
        {date} 기준 · Korea Fear & Greed 시장 심리 브리핑
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        {/* Score gauge — 점수가 먼저 */}
        <ScoreGauge score={score} regime={regime} change={change} vkospiRaw={vkospiRaw} />

        {/* Action guide */}
        <div
          className="rounded-[var(--radius-lg)] p-5 md:p-6 border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <span
            className="font-data text-xs font-semibold tracking-[0.04em] uppercase px-2.5 py-1 rounded-[var(--radius-sm)] inline-block mb-4"
            style={{
              background: `color-mix(in srgb, ${info.color} 15%, var(--surface))`,
              color: info.color,
            }}
          >
            {info.label}
          </span>
          <h1
            className="font-display text-[22px] md:text-[24px] font-semibold leading-[1.4] mb-3"
            style={{ color: 'var(--text-1)' }}
          >
            {info.usagePoints[0]}
          </h1>

          {/* Percentile + win rate one-liner */}
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
            과거 3년간 현재보다 낮았던 날:{" "}
            <span className="font-bold font-data" style={{ color: info.color }}>{percentile}%</span>
            {totalCases > 0 && (
              <> · 유사 구간 {totalCases}개 케이스 중 90일 후 양수 수익률{" "}
                <span className="font-bold font-data" style={{ color: winPct >= 50 ? 'var(--greed)' : 'var(--fear)' }}>
                  {winPct}%
                </span>
              </>
            )}
          </p>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {info.interpretation}
          </p>
        </div>
      </div>
    </section>
  );
}
