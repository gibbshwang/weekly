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
import { getScoreColor, REGIME_LABELS } from "@/lib/constants/regime";
import { REGIME_THRESHOLDS } from "@/lib/config/regime";

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
  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 text-xs font-data"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p style={{ color: 'var(--text-3)' }}>{d.date}</p>
      <p className="font-bold mt-0.5" style={{ color }}>
        {d.score} — {REGIME_LABELS[d.regime as keyof typeof REGIME_LABELS] ?? d.regime}
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
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
            {REGIME_THRESHOLDS.slice(0, -1).map(t => (
              <ReferenceLine
                key={t.regime}
                y={t.max + 1}
                stroke={t.color}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{ value: t.label, fill: t.color, fontSize: 9 }}
              />
            ))}
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
