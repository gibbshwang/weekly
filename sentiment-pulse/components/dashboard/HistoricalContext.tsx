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
    <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-white">역사적 맥락</h2>

      {/* Percentile bar */}
      <div>
        <p className="text-sm text-gray-300 mb-3">
          현재 지수는 최근 3년 중{" "}
          <span className="text-red-400 font-bold">하위 {percentile}%</span> 구간에 위치합니다
        </p>
        <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
          {/* Gradient zones */}
          <div className="absolute inset-0 flex">
            <div className="h-full bg-red-700/60" style={{ width: "20%" }} />
            <div className="h-full bg-red-500/60" style={{ width: "20%" }} />
            <div className="h-full bg-gray-500/60" style={{ width: "20%" }} />
            <div className="h-full bg-green-500/60" style={{ width: "20%" }} />
            <div className="h-full bg-amber-600/60" style={{ width: "20%" }} />
          </div>
          {/* Percentile marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg"
            style={{ left: `calc(${percentile}% - 2px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>최저</span>
          <span>평균</span>
          <span>최고</span>
        </div>
      </div>

      {/* Similar events */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          유사 구간 사례
        </h3>
        <div className="flex flex-col gap-2">
          {similarEvents.map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-800"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <span className="text-xs font-bold text-red-400">{event.score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{event.label}</span>
                  <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
