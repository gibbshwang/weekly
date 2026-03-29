interface PercentileContextProps {
  percentile: number;
  totalOccurrences: number;
  currentScore: number;
}

export default function PercentileContext({ percentile, totalOccurrences, currentScore }: PercentileContextProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border flex flex-col gap-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h2 className="font-body text-base font-semibold" style={{ color: 'var(--text-1)' }}>
        역사적 위치
      </h2>

      {/* Percentile bar */}
      <div>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="absolute inset-0 flex">
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--extreme-fear) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--fear) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--neutral) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--greed) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--extreme-greed) 60%, transparent)" }} />
          </div>
          <div
            className="absolute top-0 bottom-0 w-1 rounded-full shadow-lg"
            style={{ left: `calc(${percentile}% - 2px)`, background: 'var(--text-1)' }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)' }}>
          <span>극단적 공포</span>
          <span>현재 ({currentScore})</span>
          <span>극단적 탐욕</span>
        </div>
      </div>

      {/* Context text */}
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
        과거 10년간 현재보다 낮았던 날이{" "}
        <span className="font-bold font-data" style={{ color: 'var(--fear)' }}>
          {percentile}%
        </span>
        입니다.
        {totalOccurrences > 0 && (
          <> 최근 3년간 유사 구간(±10점)에 해당했던 거래일은{" "}
            <span className="font-bold font-data" style={{ color: 'var(--text-1)' }}>{totalOccurrences}일</span>
            입니다.
          </>
        )}
      </p>
    </div>
  );
}
