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
import { getScoreColor, REGIME_COLORS } from "@/lib/constants/regime";
import { REGIME_THRESHOLDS } from "@/lib/config/regime";

interface SparklineChartProps {
  history: HistoryPoint[];
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { score: number };
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  const color = getScoreColor(payload.score);
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
}

interface TooltipPayload {
  value: number;
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
        {d.score} —{" "}
        {d.regime === "extreme_fear" ? "극단적 공포" :
         d.regime === "fear" ? "공포" :
         d.regime === "neutral" ? "중립" :
         d.regime === "greed" ? "탐욕" : "극단적 탐욕"}
      </p>
    </div>
  );
}

function formatXDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SparklineChart({ history }: SparklineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border flex flex-col gap-3"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div>
        <h2 className="font-body text-sm font-semibold" style={{ color: 'var(--text-1)' }}>30일 추이</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>최근 30거래일 심리 지수 변화</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "극단적 공포", color: "#dc2626" },
          { label: "공포", color: "#ef4444" },
          { label: "중립", color: "#6b7280" },
          { label: "탐욕", color: "#22c55e" },
          { label: "극단적 탐욕", color: "#d97706" },
        ].map((z) => (
          <div key={z.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{z.label}</span>
          </div>
        ))}
      </div>

      <div className="h-56 min-w-0 overflow-hidden">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXDate}
                tick={{ fill: "#4a4a54", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#1e1e26" }}
                interval={4}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#4a4a54", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {REGIME_THRESHOLDS.slice(0, -1).map(t => (
                <ReferenceLine key={t.regime} y={t.max + 1} stroke={t.color} strokeDasharray="3 3" strokeOpacity={0.5} />
              ))}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#ef4444"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 5, fill: "#ef4444" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full rounded animate-pulse" style={{ background: 'var(--border)' }} />
        )}
      </div>

      <div className="flex justify-between text-xs font-data px-1">
        {REGIME_THRESHOLDS.map(t => (
          <span key={t.regime} style={{ color: t.color }}>{t.min} {t.label}</span>
        ))}
      </div>
    </div>
  );
}
