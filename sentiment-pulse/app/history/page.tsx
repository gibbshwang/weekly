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
import { mockHistory, mockContext } from "@/data/mockData";
import Link from "next/link";

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
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

type Period = "30" | "90" | "all";

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>("30");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const tabs: { id: Period; label: string; pro: boolean }[] = [
    { id: "30", label: "30일", pro: false },
    { id: "90", label: "90일", pro: true },
    { id: "all", label: "전체", pro: true },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-white">히스토리</h1>
        <p className="text-sm text-gray-500 mt-1">MOODEX 심리 지수 과거 데이터</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-gray-900 rounded-xl p-1 w-fit border border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              period === tab.id
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
            {tab.pro && (
              <span className="text-xs bg-amber-600/20 text-amber-500 px-1.5 py-0.5 rounded-full border border-amber-600/30">
                PRO
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800 relative">
        <h2 className="text-base font-bold text-white mb-4">심리 지수 추이</h2>
        <div className="h-72 min-w-0 overflow-hidden">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "극공포", fill: "#dc2626", fontSize: 9 }} />
                <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "공포", fill: "#ef4444", fontSize: 9 }} />
                <ReferenceLine y={60} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "중립", fill: "#9ca3af", fontSize: 9 }} />
                <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "탐욕", fill: "#22c55e", fontSize: 9 }} />
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

        {/* Pro blur overlay for 90d/all */}
        {period !== "30" && (
          <div className="absolute inset-0 rounded-xl bg-gray-950/80 flex flex-col items-center justify-center gap-4 p-6">
            <span className="text-2xl">🔒</span>
            <p className="text-sm font-bold text-amber-400">PRO 전용 기능</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              90일 이상 히스토리 데이터는 PRO 구독자에게 제공됩니다
            </p>
            <Link
              href="/subscribe"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-sm transition-colors"
            >
              PRO 시작하기
            </Link>
          </div>
        )}
      </div>

      {/* Similar events table */}
      <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">유사 구간 사례</h2>
          <span className="text-xs text-gray-500">공포 구간 기준</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left pb-3 pr-4">날짜</th>
                <th className="text-left pb-3 pr-4">이벤트</th>
                <th className="text-center pb-3 pr-4">점수</th>
                <th className="text-left pb-3">설명</th>
              </tr>
            </thead>
            <tbody>
              {mockContext.similarEvents.map((event, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{formatDate(event.date)}</td>
                  <td className="py-3 pr-4 text-white font-medium">{event.label}</td>
                  <td className="py-3 pr-4 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: getScoreColor(event.score) }}
                    >
                      {event.score}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">{event.note}</td>
                </tr>
              ))}
              {/* Pro locked rows */}
              <tr className="border-b border-gray-800/50 opacity-40 select-none">
                <td className="py-3 pr-4 text-gray-400">2022.06.17</td>
                <td className="py-3 pr-4 text-white font-medium blur-sm">████████████</td>
                <td className="py-3 pr-4 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white bg-red-700">17</span>
                </td>
                <td className="py-3 text-gray-400 text-xs blur-sm">████████████████████</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-2 p-3 bg-amber-900/10 border border-amber-800/20 rounded-lg">
          <span className="text-amber-500 text-sm">🔒</span>
          <p className="text-xs text-gray-500">
            더 많은 사례 데이터는{" "}
            <Link href="/subscribe" className="text-amber-400 hover:underline">PRO 구독</Link>
            에서 확인할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
