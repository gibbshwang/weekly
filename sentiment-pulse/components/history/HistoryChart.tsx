"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HistoryPoint } from "@/lib/types/kfgi";

const REGIME_COLORS: Record<string, string> = {
  extreme_fear: "#dc2626",
  fear: "#ef4444",
  neutral: "#6b7280",
  greed: "#22c55e",
  extreme_greed: "#d97706",
};

function getScoreColor(score: number): string {
  if (score <= 24) return REGIME_COLORS.extreme_fear;
  if (score <= 44) return REGIME_COLORS.fear;
  if (score <= 55) return REGIME_COLORS.neutral;
  if (score <= 74) return REGIME_COLORS.greed;
  return REGIME_COLORS.extreme_greed;
}

function formatXDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { score: number };
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  return <circle cx={cx} cy={cy} r={3} fill={getScoreColor(payload.score)} stroke="none" />;
}

interface TooltipPayload {
  payload: { date: string; score: number; regime: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = getScoreColor(d.score);
  const labels: Record<string, string> = {
    extreme_fear: "극단적 공포",
    fear: "공포",
    neutral: "중립",
    greed: "탐욕",
    extreme_greed: "극단적 탐욕",
  };
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400">{d.date}</p>
      <p className="font-bold mt-0.5" style={{ color }}>
        {d.score} — {labels[d.regime]}
      </p>
    </div>
  );
}

export default function HistoryChart({ data }: { data: HistoryPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="h-72 min-w-0 overflow-hidden">
      {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXDate}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#374151" }}
              interval={3}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={25} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "극공포", fill: "#dc2626", fontSize: 9 }} />
            <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "공포", fill: "#ef4444", fontSize: 9 }} />
            <ReferenceLine y={56} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "중립", fill: "#9ca3af", fontSize: 9 }} />
            <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "탐욕", fill: "#22c55e", fontSize: 9 }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#ef4444"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full bg-gray-800/30 rounded animate-pulse" />
      )}
    </div>
  );
}
