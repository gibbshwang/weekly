import { DirectionBadge } from "@/components/ui/Badge";
import type { SignalReading } from "@/lib/types/kfgi";

const SCORE_COLOR = (score: number) => {
  if (score <= 20) return "bg-red-700";
  if (score <= 40) return "bg-red-500";
  if (score <= 60) return "bg-gray-500";
  if (score <= 80) return "bg-green-500";
  return "bg-amber-600";
};

type ComponentCardProps = Omit<SignalReading, 'key'>;

export default function ComponentCard({ label, labelEn, normalizedScore, direction, note }: ComponentCardProps) {
  const hasData = Number.isFinite(normalizedScore);

  if (!hasData) {
    return (
      <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-800 opacity-60">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-400">{label}</p>
            <p className="text-xs text-gray-600">{labelEn}</p>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full w-full" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-600">—</span>
            <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-amber-900/40 text-amber-500 border border-amber-800/40">
              데이터 없음
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-gray-500">{labelEn}</p>
          </div>
          {direction && <DirectionBadge direction={direction} />}
        </div>

        {/* Score bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">공포</span>
            <span className="text-lg font-bold text-white">{normalizedScore}</span>
            <span className="text-xs text-gray-500">탐욕</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${SCORE_COLOR(normalizedScore)}`}
              style={{ width: `${normalizedScore}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}
