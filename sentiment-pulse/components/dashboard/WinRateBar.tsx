"use client";

interface WinRateBarProps {
  winRate: number; // 0-1
  totalCases: number;
}

export default function WinRateBar({ winRate, totalCases }: WinRateBarProps) {
  const pct = Math.round(winRate * 100);
  const losePct = 100 - pct;
  const winCount = Math.round(winRate * totalCases);
  const loseCount = totalCases - winCount;
  const allNegative = pct === 0 && totalCases > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-data font-semibold" style={{ color: 'var(--greed)' }}>
          양수 {winCount}건
        </span>
        <span className="font-data font-bold text-sm" style={{ color: pct >= 50 ? 'var(--greed)' : 'var(--fear)' }}>
          {pct}% 승률
        </span>
        <span className="font-data font-semibold" style={{ color: 'var(--fear)' }}>
          음수 {loseCount}건
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
        {pct > 0 && (
          <div
            className="h-full rounded-l-full transition-all"
            style={{ width: `${pct}%`, background: 'var(--greed)' }}
          />
        )}
        {losePct > 0 && (
          <div
            className="h-full rounded-r-full transition-all"
            style={{ width: `${losePct}%`, background: 'var(--fear)' }}
          />
        )}
      </div>
      {allNegative && (
        <p className="text-xs" style={{ color: 'var(--warning, var(--fear))' }}>
          모든 사례에서 90일 후 KOSPI 수익률이 음수였습니다
        </p>
      )}
    </div>
  );
}
