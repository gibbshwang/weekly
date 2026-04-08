"use client";

import { useState } from "react";
import type { HeatmapData } from "@/lib/types/kfgi";

interface CrossAssetHeatmapProps {
  data: HeatmapData;
}

type Metric = "avg" | "median" | "winRate";
const metricLabels: Record<Metric, string> = { avg: "평균 수익률", median: "중앙값", winRate: "승률" };

function cellColor(value: number, metric: Metric): string {
  if (metric === "winRate") {
    if (value >= 60) return "var(--greed)";
    if (value >= 50) return "var(--text-2)";
    return "var(--fear)";
  }
  if (value > 0) return "var(--greed)";
  if (value === 0) return "var(--text-2)";
  return "var(--fear)";
}

function cellBgOpacity(value: number, metric: Metric): string {
  if (metric === "winRate") {
    if (value >= 75) return "color-mix(in srgb, var(--greed) 20%, transparent)";
    if (value >= 60) return "color-mix(in srgb, var(--greed) 10%, transparent)";
    if (value >= 50) return "color-mix(in srgb, var(--neutral) 10%, transparent)";
    if (value >= 40) return "color-mix(in srgb, var(--fear) 10%, transparent)";
    return "color-mix(in srgb, var(--fear) 20%, transparent)";
  }
  if (value > 5) return "color-mix(in srgb, var(--greed) 20%, transparent)";
  if (value > 2) return "color-mix(in srgb, var(--greed) 10%, transparent)";
  if (value > 0) return "color-mix(in srgb, var(--greed) 5%, transparent)";
  if (value > -2) return "color-mix(in srgb, var(--fear) 10%, transparent)";
  return "color-mix(in srgb, var(--fear) 20%, transparent)";
}

function formatCell(value: number, metric: Metric): string {
  if (metric === "winRate") return `${value}%`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function CrossAssetHeatmap({ data }: CrossAssetHeatmapProps) {
  const [metric, setMetric] = useState<Metric>("avg");

  return (
    <div
      className="rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="px-4 md:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="font-body text-base font-semibold" style={{ color: 'var(--text-1)' }}>크로스에셋 히트맵</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>현재 레짐 유사 구간에서의 자산별 · 기간별 성과</p>
        </div>
        <div className="flex gap-0.5 rounded-[var(--radius-md)] p-0.5" style={{ background: 'var(--bg)' }}>
          {(Object.keys(metricLabels) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className="px-3 py-1 rounded-[6px] text-xs font-medium transition-all"
              style={{
                background: metric === m ? 'var(--surface)' : 'transparent',
                color: metric === m ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-xs" style={{ color: 'var(--text-3)' }}>자산</th>
              {data.horizons.map((h) => (
                <th key={h} className="text-center px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.assets.map((asset) => (
              <tr key={asset} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td className="px-4 py-2.5 font-medium whitespace-nowrap font-body" style={{ color: 'var(--text-1)' }}>{asset}</td>
                {data.horizons.map((h) => {
                  const cell = data.data[asset][h];
                  const v = cell[metric];
                  return (
                    <td key={h} className="px-2 py-2 text-center">
                      <div
                        className="rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-semibold font-data"
                        style={{ background: cellBgOpacity(v, metric), color: cellColor(v, metric) }}
                      >
                        {formatCell(v, metric)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
