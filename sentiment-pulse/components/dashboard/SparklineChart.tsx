"use client";

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
import { mockHistory } from "@/data/mockData";

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
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400">{d.date}</p>
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

export default function SparklineChart() {
  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800 flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">30일 추이</h2>
        <p className="text-xs text-gray-500 mt-1">최근 30거래일 심리 지수 변화</p>
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
            <span className="text-xs text-gray-500">{z.label}</span>
          </div>
        ))}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXDate}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#374151" }}
              interval={4}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#6b7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Reference zone bands */}
            <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={60} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
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
      </div>

      <div className="flex justify-between text-xs text-gray-600 px-1">
        <span className="text-red-700">0 극단적공포</span>
        <span className="text-red-400">20 공포</span>
        <span className="text-gray-500">40 중립</span>
        <span className="text-green-500">60 탐욕</span>
        <span className="text-amber-600">80 극단적탐욕</span>
      </div>
    </div>
  );
}
