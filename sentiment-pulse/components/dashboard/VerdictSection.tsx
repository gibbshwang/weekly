import type { ConsensusSummary } from '@/lib/types/narrative';
import WinRateBar from './WinRateBar';
import ReturnGrid from './ReturnGrid';

interface VerdictSectionProps {
  consensus: ConsensusSummary;
}

export default function VerdictSection({ consensus }: VerdictSectionProps) {
  const { winRate90d, avgReturns, totalCases, headline } = consensus;

  if (totalCases === 0) return null;

  const isFewCases = totalCases <= 2;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border flex flex-col gap-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div>
        <h2 className="font-body text-base font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
          컨센서스
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {headline}
        </p>
      </div>

      {/* Few cases warning */}
      {isFewCases && (
        <div
          className="px-3 py-2 rounded-[var(--radius-md)] text-xs"
          style={{
            background: 'color-mix(in srgb, var(--warning, #d97706) 10%, var(--surface))',
            color: 'var(--warning, #d97706)',
          }}
        >
          소수 사례({totalCases}건) 기반 분석입니다. 통계적 신뢰도가 낮을 수 있습니다.
        </div>
      )}

      {/* Win rate bar */}
      <WinRateBar winRate={winRate90d} totalCases={totalCases} />

      {/* Average returns across all cases */}
      <div>
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-2 font-data"
          style={{ color: 'var(--text-3)' }}
        >
          평균 수익률
        </h3>
        <ReturnGrid returns={avgReturns} />
      </div>

      {/* Disclaimer */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
        과거 패턴이 미래 수익을 보장하지 않습니다. 표본이 작은 극단 구간에서는 통계적 신뢰도가 낮을 수 있습니다.
      </p>
    </div>
  );
}
