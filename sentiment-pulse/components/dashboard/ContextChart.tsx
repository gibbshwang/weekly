"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  ChartAsset,
  TimeRange,
  KfgiPricePoint,
  KfgiPriceData,
} from "@/lib/types/charts";

const ASSETS: { key: ChartAsset; label: string }[] = [
  { key: "KOSPI", label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
  { key: "BTC", label: "BTC" },
  { key: "Gold", label: "Gold" },
];

const RANGES: { key: TimeRange; label: string }[] = [
  { key: "1M", label: "1개월" },
  { key: "3M", label: "3개월" },
  { key: "6M", label: "6개월" },
  { key: "1Y", label: "1년" },
];

interface ContextChartProps {
  data: KfgiPriceData;
}

/* ── Tooltip ── */

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
  payload: KfgiPricePoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  selectedAsset: ChartAsset;
}

function CustomTooltip({ active, payload, selectedAsset }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400">{pt.date}</p>
      <p className="text-blue-400 font-semibold mt-1">K-FGI {pt.score}</p>
      <p className="text-emerald-400 font-semibold">
        {selectedAsset} {pt.priceIndex.toFixed(1)}
      </p>
    </div>
  );
}

function formatXDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ContextChart({ data }: ContextChartProps) {
  const [mounted, setMounted] = useState(false);
  const [asset, setAsset] = useState<ChartAsset>("KOSPI");
  const [range, setRange] = useState<TimeRange>("3M");

  useEffect(() => {
    setMounted(true);
  }, []);

  const series: KfgiPricePoint[] = data[asset]?.[range] ?? [];

  // Compute priceIndex Y domain
  const prices = series.map((d) => d.priceIndex);
  const pMin = prices.length ? Math.floor(Math.min(...prices) - 2) : 90;
  const pMax = prices.length ? Math.ceil(Math.max(...prices) + 2) : 110;

  // X-axis tick interval
  const tickInterval = series.length > 60 ? 9 : series.length > 30 ? 4 : 2;

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-5 border border-gray-800 flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">시장 심리 vs 자산 가격</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            K-FGI 지수와 자산 가격(리베이스) 비교
          </p>
        </div>

        {/* Range selector */}
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                range === r.key
                  ? "bg-gray-700 text-white font-semibold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset selector */}
      <div className="flex gap-1.5">
        {ASSETS.map((a) => (
          <button
            key={a.key}
            onClick={() => setAsset(a.key)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              asset === a.key
                ? "border-emerald-600 bg-emerald-950/50 text-emerald-400 font-semibold"
                : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64 min-w-0 overflow-hidden">
        {mounted && series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXDate}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
                interval={tickInterval}
              />
              {/* Left Y: K-FGI 0-100 */}
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fill: "#60a5fa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              {/* Right Y: Price index */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[pMin, pMax]}
                tick={{ fill: "#34d399", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                content={<CustomTooltip selectedAsset={asset} />}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="score"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                name="K-FGI"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="priceIndex"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                name={asset}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : !mounted ? (
          <div className="w-full h-full bg-gray-800/30 rounded animate-pulse" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-600">
            데이터 없음
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-400 rounded" />
          <span className="text-gray-500">K-FGI (0–100)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-400 rounded" />
          <span className="text-gray-500">{asset} 가격 (리베이스 100)</span>
        </div>
      </div>
    </div>
  );
}
