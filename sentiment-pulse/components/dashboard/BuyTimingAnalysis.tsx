"use client";

import { useState } from "react";
import type { TimingAnalysis } from "@/lib/types/kfgi";
import type { PostSignalPathData } from "@/lib/types/charts";
import PostSignalPathChart from "./PostSignalPathChart";

interface BuyTimingAnalysisProps {
  data: TimingAnalysis;
  pathData?: PostSignalPathData[];
}

type Metric = "avg" | "median" | "winRate";
const metricLabels: Record<Metric, string> = { avg: "평균", median: "중앙값", winRate: "승률" };
const horizons = ["horizon7d", "horizon30d", "horizon90d", "horizon180d"] as const;
const horizonLabels = ["7D", "30D", "90D", "180D"];

function cellColor(value: number, metric: Metric): string {
  if (metric === "winRate") {
    if (value >= 75) return "bg-green-600/30 text-green-400";
    if (value >= 60) return "bg-green-600/15 text-green-300";
    if (value >= 50) return "bg-gray-700/30 text-gray-300";
    return "bg-red-600/15 text-red-300";
  }
  if (value > 5) return "bg-green-600/30 text-green-400";
  if (value > 2) return "bg-green-600/15 text-green-300";
  if (value > 0) return "bg-green-600/5 text-green-200";
  if (value > -2) return "bg-red-600/10 text-red-300";
  return "bg-red-600/25 text-red-400";
}

function formatValue(value: number, metric: Metric): string {
  if (metric === "winRate") return `${value}%`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function BuyTimingAnalysis({ data, pathData }: BuyTimingAnalysisProps) {
  const [metric, setMetric] = useState<Metric>("avg");

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            매수 타이밍 분석
            <span className="text-xs font-normal text-red-400 ml-2">공포 ≤ {data.threshold}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            과거 {data.caseCount}회 극단적 공포 구간 이후 자산별 성과
          </p>
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
              {horizonLabels.map((h) => (
                <th key={h} className="text-center px-3 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.assets.map((asset) => (
              <tr key={asset.name} className="border-t border-gray-800/50">
                <td className="px-4 py-2.5 font-medium text-white whitespace-nowrap">{asset.name}</td>
                {horizons.map((h, i) => {
                  const v = asset[h][metric];
                  return (
                    <td key={h} className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cellColor(v, metric)}`}>
                        {formatValue(v, metric)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Post-signal price path mini chart */}
      {pathData && pathData.length > 0 && (
        <div className="px-4 md:px-6 py-4 border-t border-gray-800">
          <PostSignalPathChart data={pathData[0]} type="buy" />
        </div>
      )}
    </div>
  );
}
