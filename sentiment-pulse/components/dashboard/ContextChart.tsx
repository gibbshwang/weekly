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
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 text-xs font-data"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p style={{ color: 'var(--text-3)' }}>{pt.date}</p>
      <p className="font-semibold mt-1" style={{ color: '#60a5fa' }}>Fear & Greed {pt.score}</p>
      <p className="font-semibold" style={{ color: 'var(--greed)' }}>
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
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const series: KfgiPricePoint[] = data[asset]?.[range] ?? [];

  const prices = series.map((d) => d.priceIndex);
  const pMin = prices.length ? Math.floor(Math.min(...prices) - 2) : 90;
  const pMax = prices.length ? Math.ceil(Math.max(...prices) + 2) : 110;

  const tickInterval = series.length > 60 ? 9 : series.length > 30 ? 4 : 2;

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border flex flex-col gap-3"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-body text-sm font-semibold" style={{ color: 'var(--text-1)' }}>시장 심리 vs 자산 가격</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            심리지수와 자산 가격(리베이스) 비교
          </p>
        </div>

        {/* Range selector */}
        <div className="flex gap-0.5 rounded-[var(--radius-md)] p-0.5" style={{ background: 'var(--bg)' }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="px-2.5 py-1 text-xs rounded-[6px] font-medium transition-all"
              style={{
                background: range === r.key ? 'var(--surface)' : 'transparent',
                color: range === r.key ? 'var(--text-1)' : 'var(--text-3)',
              }}
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
            className="px-3 py-1.5 text-xs rounded-[var(--radius-md)] border transition-colors font-medium"
            style={{
              borderColor: asset === a.key ? 'var(--greed)' : 'var(--border)',
              background: asset === a.key ? 'color-mix(in srgb, var(--greed) 10%, var(--surface))' : 'transparent',
              color: asset === a.key ? 'var(--greed)' : 'var(--text-3)',
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64 min-w-0 overflow-hidden">
        {mounted && series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXDate}
                tick={{ fill: "#4a4a54", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#1e1e26" }}
                interval={tickInterval}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fill: "#60a5fa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[pMin, pMax]}
                tick={{ fill: "#22c55e", fontSize: 10 }}
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
                name="Fear & Greed"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="priceIndex"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name={asset}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : !mounted ? (
          <div className="w-full h-full rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
            데이터 없음
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: '#60a5fa' }} />
          <span style={{ color: 'var(--text-3)' }}>Fear & Greed (0–100)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: '#22c55e' }} />
          <span style={{ color: 'var(--text-3)' }}>{asset} 가격 (리베이스 100)</span>
        </div>
      </div>
    </div>
  );
}
