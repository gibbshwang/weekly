"use client";

import { interpretations } from "@/data/interpretations";

interface ScoreGaugeProps {
  score: number;
  regime: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  change: number;
  vkospiRaw: number | null;
}

const REGIME_COLORS: Record<string, string> = {
  extreme_fear: "#dc2626",
  fear: "#ef4444",
  neutral: "#6b7280",
  greed: "#22c55e",
  extreme_greed: "#d97706",
};

function getScoreColor(score: number): string {
  if (score <= 20) return REGIME_COLORS.extreme_fear;
  if (score <= 40) return REGIME_COLORS.fear;
  if (score <= 60) return REGIME_COLORS.neutral;
  if (score <= 80) return REGIME_COLORS.greed;
  return REGIME_COLORS.extreme_greed;
}

export default function ScoreGauge({ score, regime, change, vkospiRaw }: ScoreGaugeProps) {
  const color = getScoreColor(score);

  // SVG arc gauge parameters
  const cx = 160;
  const cy = 140;
  const r = 100;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (fromAngle: number, toAngle: number, radius: number) => {
    const x1 = cx + radius * Math.cos(toRad(fromAngle));
    const y1 = cy + radius * Math.sin(toRad(fromAngle));
    const x2 = cx + radius * Math.cos(toRad(toAngle));
    const y2 = cy + radius * Math.sin(toRad(toAngle));
    const largeArc = toAngle - fromAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const needleAngle = startAngle + (score / 100) * totalAngle;
  const needleLen = 75;
  const needleX = cx + needleLen * Math.cos(toRad(needleAngle));
  const needleY = cy + needleLen * Math.sin(toRad(needleAngle));

  const zones = [
    { from: 0, to: 20, color: REGIME_COLORS.extreme_fear },
    { from: 20, to: 40, color: REGIME_COLORS.fear },
    { from: 40, to: 60, color: REGIME_COLORS.neutral },
    { from: 60, to: 80, color: REGIME_COLORS.greed },
    { from: 80, to: 100, color: REGIME_COLORS.extreme_greed },
  ];

  const zoneArcPath = (fromScore: number, toScore: number, radius: number) => {
    const fa = startAngle + (fromScore / 100) * totalAngle;
    const ta = startAngle + (toScore / 100) * totalAngle;
    return arcPath(fa, ta, radius);
  };

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border h-full flex flex-col items-center justify-center"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* SVG Gauge */}
      <div className="relative w-full max-w-xs mx-auto">
        <svg viewBox="0 0 320 210" className="w-full">
          {/* Background arc */}
          <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
          {/* Zone colors */}
          {zones.map((z, i) => (
            <path key={i} d={zoneArcPath(z.from, z.to, r)} fill="none" stroke={z.color} strokeWidth="12" opacity="0.35" />
          ))}
          {/* Active arc */}
          <path d={arcPath(startAngle, needleAngle, r)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
          {/* Needle */}
          <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--text-1)" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill="var(--text-1)" />
          <circle cx={cx} cy={cy} r="3" fill={color} />
          {/* Score number — pushed down with breathing room */}
          <text
            x={cx} y={cy + 48}
            textAnchor="middle"
            fill={color}
            fontSize="40"
            fontWeight="800"
            style={{ fontFamily: "var(--font-data)", fontVariantNumeric: "tabular-nums" }}
          >
            {score}
          </text>
        </svg>
      </div>

      {/* Metadata */}
      <div className="flex flex-col items-center gap-1 -mt-1">
        <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>Fear & Greed Score</span>
        <span
          className="font-data text-[13px]"
          style={{ color: change < 0 ? 'var(--fear)' : 'var(--greed)' }}
        >
          {change < 0 ? "▼" : "▲"} {Math.abs(change)}pt vs 어제
        </span>
      </div>
    </div>
  );
}
