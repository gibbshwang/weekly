"use client";

import { useState } from "react";
import type { HeatmapData } from "@/lib/types/kfgi";

interface CrossAssetHeatmapProps {
  data: HeatmapData;
}

type Metric = "avg" | "median" | "winRate";
const metricLabels: Record<Metric, string> = { avg: "평균 수익률", median: "중앙값", winRate: "승률" };

function cellBg(value: number, metric: Metric): string {
  if (metric === "winRate") {
    if (value >= 75) return "bg-green-600/40";
    if (value >= 60) return "bg-green-600/20";
    if (value >= 50) return "bg-gray-700/40";
    if (value >= 40) return "bg-red-600/20";
    return "bg-red-600/40";
  }
  if (value > 5) return "bg-green-600/40";
  if (value > 2) return "bg-green-600/20";
  if (value > 0) return "bg-green-600/8";
  if (value > -2) return "bg-red-600/10";
  return "bg-red-600/30";
}

function cellText(value: number, metric: Metric): string {
  if (metric === "winRate") {
    if (value >= 60) return "text-green-300";
    if (value >= 50) return "text-gray-300";
    return "text-red-300";
  }
  if (value > 0) return "text-green-300";
  if (value === 0) return "text-gray-300";
  return "text-red-300";
}

function formatCell(value: number, metric: Metric): string {
  if (metric === "winRate") return `${value}%`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function CrossAssetHeatmap({ data }: CrossAssetHeatmapProps) {
  const [metric, setMetric] = useState<Metric>("avg");

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">크로스에셋 히트맵</h2>
          <p className="text-xs text-gray-500 mt-0.5">현재 레짐 유사 구간에서의 자산별 · 기간별 성과</p>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {(Object.keys(metricLabels) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                metric === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="text-left px-4 py-2.5 font-medium">자산</th>
              {data.horizons.map((h) => (
                <th key={h} className="text-center px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.assets.map((asset) => (
              <tr key={asset} className="border-t border-gray-800/50">
                <td className="px-4 py-2.5 font-medium text-white whitespace-nowrap">{asset}</td>
                {data.horizons.map((h) => {
                  const cell = data.data[asset][h];
                  const v = cell[metric];
                  return (
                    <td key={h} className="px-2 py-2 text-center">
                      <div className={`rounded px-2 py-1.5 text-xs font-semibold ${cellBg(v, metric)} ${cellText(v, metric)}`}>
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
