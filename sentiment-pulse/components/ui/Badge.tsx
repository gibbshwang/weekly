import { Regime } from "@/data/interpretations";

interface BadgeProps {
  regime: Regime;
  size?: "sm" | "md";
}

const regimeConfig: Record<Regime, { label: string; className: string }> = {
  extreme_fear: { label: "극단적 공포", className: "bg-red-700 text-white" },
  fear: { label: "공포", className: "bg-red-500 text-white" },
  neutral: { label: "중립", className: "bg-gray-500 text-white" },
  greed: { label: "탐욕", className: "bg-green-500 text-white" },
  extreme_greed: { label: "극단적 탐욕", className: "bg-amber-600 text-white" },
};

export function Badge({ regime, size = "md" }: BadgeProps) {
  const config = regimeConfig[regime];
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: "fear" | "neutral" | "greed" | "extreme_fear" | "extreme_greed" }) {
  const config: Record<string, { label: string; className: string }> = {
    extreme_fear: { label: "극단적 공포", className: "bg-red-700/20 text-red-400 border border-red-700/40" },
    fear: { label: "공포", className: "bg-red-500/20 text-red-400 border border-red-500/40" },
    neutral: { label: "중립", className: "bg-gray-500/20 text-gray-400 border border-gray-500/40" },
    greed: { label: "탐욕", className: "bg-green-500/20 text-green-400 border border-green-500/40" },
    extreme_greed: { label: "극단적 탐욕", className: "bg-amber-600/20 text-amber-400 border border-amber-600/40" },
  };
  const c = config[direction] ?? config.neutral;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
