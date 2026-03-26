import type { RegimeType } from "@/lib/types/kfgi";
import { interpretations } from "@/data/interpretations";

interface UsageGuideProps {
  regime: RegimeType;
}

export default function UsageGuide({ regime }: UsageGuideProps) {
  const info = interpretations[regime];

  return (
    <div
      className="rounded-xl border flex flex-col gap-0 overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${info.color} 30%, #1f2937)` }}
    >
      {/* Header band */}
      <div
        className="px-4 md:px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: `color-mix(in srgb, ${info.color} 15%, #111827)` }}
      >
        <div>
          <h2 className="text-base font-bold text-white">
            이 구간, 어떻게 활용할까?
          </h2>
          <p className="text-xs mt-0.5" style={{ color: `color-mix(in srgb, ${info.color} 70%, #9ca3af)` }}>
            {info.label} 레짐 기준 — 역사적 패턴에서 관찰된 접근 방식
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{
            color: info.color,
            borderColor: `color-mix(in srgb, ${info.color} 40%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${info.color} 12%, transparent)`,
          }}
        >
          {info.label}
        </span>
      </div>

      <div className="bg-gray-900 p-4 md:p-6 flex flex-col gap-5">
        {/* Usage points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {info.usagePoints.map((point, i) => (
            <div key={i} className="flex items-start gap-3 bg-gray-800/40 rounded-lg p-3 border border-gray-800">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                style={{ backgroundColor: info.color }}
              >
                {i + 1}
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>

        {/* Watch for */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-3">
            전환 신호 — 주목할 지점
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {info.watchFor.map((signal, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-yellow-500 text-xs flex-shrink-0">→</span>
                <span className="text-sm text-gray-400">{signal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-600 leading-relaxed">
          ℹ 위 내용은 역사적 패턴 분석에 기반한 일반적 관찰이며, 개인 투자 권유가 아닙니다.
          투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
        </p>
      </div>
    </div>
  );
}
