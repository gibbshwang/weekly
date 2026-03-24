import { DirectionBadge } from "@/components/ui/Badge";

interface ComponentCardProps {
  id: string;
  label: string;
  labelEn: string;
  score: number | null;
  status: "active" | "phase_1_5" | "phase_2";
  direction: "fear" | "neutral" | "greed" | "extreme_fear" | "extreme_greed" | null;
  note: string;
}

const SCORE_COLOR = (score: number) => {
  if (score <= 20) return "bg-red-700";
  if (score <= 40) return "bg-red-500";
  if (score <= 60) return "bg-gray-500";
  if (score <= 80) return "bg-green-500";
  return "bg-amber-600";
};

const PHASE_BADGE: Record<string, { label: string; className: string }> = {
  phase_1_5: { label: "Phase 1.5 준비 중", className: "bg-amber-900/40 text-amber-500 border border-amber-800/40" },
  phase_2: { label: "Phase 2 준비 중", className: "bg-purple-900/40 text-purple-400 border border-purple-800/40" },
};

export default function ComponentCard({ label, labelEn, score, status, direction, note }: ComponentCardProps) {
  const isActive = status === "active";

  if (!isActive) {
    const badge = PHASE_BADGE[status];
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
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badge.className}`}>
              {badge.label}
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
            <span className="text-lg font-bold text-white">{score}</span>
            <span className="text-xs text-gray-500">탐욕</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${SCORE_COLOR(score!)}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}
