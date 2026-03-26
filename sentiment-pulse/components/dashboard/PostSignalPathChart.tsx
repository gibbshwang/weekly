"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PostSignalPathData } from "@/lib/types/charts";

interface PostSignalPathChartProps {
  data: PostSignalPathData;
  type: "buy" | "sell";
}

const LINE_COLORS = {
  buy: "#22c55e",
  sell: "#f59e0b",
};

interface PathTooltipPayload {
  value: number;
  payload: { day: number; avgReturn: number };
}

interface PathTooltipProps {
  active?: boolean;
  payload?: PathTooltipPayload[];
}

function PathTooltip({ active, payload }: PathTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.avgReturn >= 0 ? "#22c55e" : "#ef4444";
  return (
    <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
      <p className="text-gray-400">D+{d.day}</p>
      <p className="font-semibold" style={{ color }}>
        {d.avgReturn > 0 ? "+" : ""}
        {d.avgReturn.toFixed(1)}%
      </p>
    </div>
  );
}

function formatDay(day: number): string {
  return day === 0 ? "진입" : `D+${day}`;
}

export default function PostSignalPathChart({
  data,
  type,
}: PostSignalPathChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const lineColor = LINE_COLORS[type];

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-gray-500">
        {data.asset} 평균 가격 경로
      </p>
      <div className="h-28 min-w-0">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.points}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                tickFormatter={formatDay}
                tick={{ fill: "#6b7280", fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
                ticks={[0, 7, 30, 90, 180]}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={38}
              />
              <ReferenceLine
                y={0}
                stroke="#6b7280"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Tooltip content={<PathTooltip />} />
              <Line
                type="monotone"
                dataKey="avgReturn"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor }}
                activeDot={{ r: 5, fill: lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full bg-gray-800/30 rounded animate-pulse" />
        )}
      </div>
    </div>
  );
}
