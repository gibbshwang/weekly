import type { HistoricalContext as HistoricalContextData } from "@/lib/types/kfgi";

interface HistoricalContextProps {
  data: HistoricalContextData;
}

const REGIME_LABELS: Record<string, { label: string; color: string }> = {
  extreme_fear: { label: "극단적 공포", color: "#dc2626" },
  fear: { label: "공포", color: "#ef4444" },
  neutral: { label: "중립", color: "#6b7280" },
  greed: { label: "탐욕", color: "#22c55e" },
  extreme_greed: { label: "극단적 탐욕", color: "#d97706" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function HistoricalContext({ data }: HistoricalContextProps) {
  const { percentile, similarEvents } = data;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border flex flex-col gap-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h2 className="font-body text-base font-semibold" style={{ color: 'var(--text-1)' }}>역사적 맥락</h2>

      {/* Percentile bar */}
      <div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
          현재 지수는 최근 3년 중{" "}
          <span className="font-bold font-data" style={{ color: 'var(--fear)' }}>하위 {percentile}%</span> 구간에 위치합니다
        </p>
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          {/* Gradient zones */}
          <div className="absolute inset-0 flex">
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--extreme-fear) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--fear) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--neutral) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--greed) 60%, transparent)" }} />
            <div className="h-full" style={{ width: "20%", background: "color-mix(in srgb, var(--extreme-greed) 60%, transparent)" }} />
          </div>
          {/* Percentile marker */}
          <div
            className="absolute top-0 bottom-0 w-1 rounded-full shadow-lg"
            style={{ left: `calc(${percentile}% - 2px)`, background: 'var(--text-1)' }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)' }}>
          <span>최저</span>
          <span>평균</span>
          <span>최고</span>
        </div>
      </div>

      {/* Similar events */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 font-data" style={{ color: 'var(--text-3)' }}>
          유사 구간 사례
        </h3>
        <div className="flex flex-col gap-2">
          {similarEvents.map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border"
              style={{ background: 'var(--bg)', borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--fear) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--fear) 30%, transparent)' }}
              >
                <span className="text-xs font-bold font-data" style={{ color: 'var(--fear)' }}>{event.score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold font-body" style={{ color: 'var(--text-1)' }}>{event.label}</span>
                  <span className="text-xs font-data" style={{ color: 'var(--text-3)' }}>{formatDate(event.date)}</span>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-3)' }}>{event.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
