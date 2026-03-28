import { Regime } from "@/data/interpretations";

interface BadgeProps {
  regime: Regime;
  size?: "sm" | "md";
}

const REGIME_COLORS: Record<Regime, string> = {
  extreme_fear: "var(--extreme-fear)",
  fear: "var(--fear)",
  neutral: "var(--neutral)",
  greed: "var(--greed)",
  extreme_greed: "var(--extreme-greed)",
};

const regimeLabels: Record<Regime, string> = {
  extreme_fear: "극단적 공포",
  fear: "공포",
  neutral: "중립",
  greed: "탐욕",
  extreme_greed: "극단적 탐욕",
};

export function Badge({ regime, size = "md" }: BadgeProps) {
  const color = REGIME_COLORS[regime];
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold font-data ${sizeClass}`}
      style={{ background: color, color: '#fff' }}
    >
      {regimeLabels[regime]}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: "fear" | "neutral" | "greed" | "extreme_fear" | "extreme_greed" }) {
  const color = REGIME_COLORS[direction] ?? REGIME_COLORS.neutral;
  const label = regimeLabels[direction] ?? "중립";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-data"
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color: color,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
