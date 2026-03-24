import { mockScore } from "@/data/mockData";
import { interpretations } from "@/data/interpretations";

export default function InterpretationCard() {
  const { regime } = mockScore;
  const info = interpretations[regime];

  return (
    <div
      className="rounded-xl p-4 md:p-6 border flex flex-col justify-between h-full"
      style={{
        backgroundColor: `color-mix(in srgb, ${info.color} 8%, #111827)`,
        borderColor: `color-mix(in srgb, ${info.color} 25%, #1f2937)`,
      }}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          className="w-1.5 rounded-full flex-shrink-0 self-stretch"
          style={{ backgroundColor: info.color }}
        />
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: info.color }}>
              현재 시장 해석
            </p>
            <p className="text-base md:text-lg font-semibold text-white leading-snug">
              {info.interpretation}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1.5">주요 원인</p>
            <p className="text-sm text-gray-400 leading-relaxed">{info.drivingFactors}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
