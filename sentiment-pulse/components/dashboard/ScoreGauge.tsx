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
  const info = interpretations[regime];
  const color = getScoreColor(score);

  // SVG arc gauge parameters
  const cx = 160;
  const cy = 150;
  const r = 110;
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
  const needleLen = 90;
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
    <div className="bg-gray-900 rounded-xl p-4 md:p-5 border border-gray-800 h-full flex flex-col items-center justify-center">
      {/* SVG Gauge */}
      <div className="relative w-full max-w-xs mx-auto">
        <svg viewBox="0 0 320 180" className="w-full">
          <path d={arcPath(startAngle, endAngle, r)} fill="none" stroke="#1f2937" strokeWidth="18" strokeLinecap="round" />
          {zones.map((z, i) => (
            <path key={i} d={zoneArcPath(z.from, z.to, r)} fill="none" stroke={z.color} strokeWidth="16" opacity="0.4" />
          ))}
          <path d={arcPath(startAngle, needleAngle, r)} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
          <text x="32" y="148" fill="#dc2626" fontSize="8" fontWeight="600" opacity="0.8">극공포</text>
          <text x="74" y="78" fill="#ef4444" fontSize="8" fontWeight="600" opacity="0.8">공포</text>
          <text x="145" y="52" fill="#6b7280" fontSize="8" fontWeight="600" opacity="0.8">중립</text>
          <text x="208" y="78" fill="#22c55e" fontSize="8" fontWeight="600" opacity="0.8">탐욕</text>
          <text x="260" y="148" fill="#d97706" fontSize="8" fontWeight="600" opacity="0.8">극탐욕</text>
          <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="7" fill="white" />
          <circle cx={cx} cy={cy} r="4" fill={color} />
          <text x={cx} y={cy + 30} textAnchor="middle" fill="white" fontSize="36" fontWeight="900" fontFamily="system-ui">
            {score}
          </text>
        </svg>
      </div>

      {/* Compact metadata */}
      <div className="flex flex-col items-center gap-1.5 -mt-1">
        <span className="text-lg font-bold" style={{ color }}>{info.label}</span>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1" style={{ color: change < 0 ? "#ef4444" : "#22c55e" }}>
            {change < 0 ? "▼" : "▲"} {Math.abs(change)}pt
          </span>
          <span>전일 대비</span>
          <span className="text-gray-600">·</span>
          <span>VKOSPI {vkospiRaw ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
