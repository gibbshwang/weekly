import { interpretations } from "@/data/interpretations";

interface InterpretationCardProps {
  regime: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
}

export default function InterpretationCard({ regime }: InterpretationCardProps) {
  const info = interpretations[regime];

  return (
    <div
      className="rounded-xl p-4 md:p-5 border flex flex-col gap-3 h-full"
      style={{
        backgroundColor: `color-mix(in srgb, ${info.color} 8%, #111827)`,
        borderColor: `color-mix(in srgb, ${info.color} 25%, #1f2937)`,
      }}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          className="w-1 rounded-full flex-shrink-0 self-stretch"
          style={{ backgroundColor: info.color }}
        />
        <div className="flex flex-col gap-3 flex-1">
          {/* Driving factors */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">주요 원인</p>
            <p className="text-sm text-gray-300 leading-relaxed">{info.drivingFactors}</p>
          </div>
          {/* Watch signals — inline */}
          <div className="flex flex-wrap gap-2">
            {info.watchFor.slice(0, 3).map((signal, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-800/60 border border-gray-700/50 text-gray-400"
              >
                <span className="text-yellow-500/80">↗</span> {signal}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
