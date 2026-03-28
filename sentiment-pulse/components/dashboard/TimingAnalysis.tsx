"use client";

import { useState } from "react";
import type { TimingAnalysis as TimingData } from "@/lib/types/kfgi";
import type { PostSignalPathData } from "@/lib/types/charts";
import PostSignalPathChart from "./PostSignalPathChart";

interface TimingAnalysisProps {
  buyData: TimingData;
  sellData: TimingData;
  buyPaths?: PostSignalPathData[];
  sellPaths?: PostSignalPathData[];
}

type Tab = "buy" | "sell";
type Metric = "avg" | "median" | "winRate";
const metricLabels: Record<Metric, string> = { avg: "평균", median: "중앙값", winRate: "승률" };
const horizons = ["horizon7d", "horizon30d", "horizon90d", "horizon180d"] as const;
const horizonLabels = ["7D", "30D", "90D", "180D"];

function cellColor(value: number, metric: Metric, tab: Tab): string {
  if (metric === "winRate") {
    if (tab === "sell") {
      if (value <= 25) return "text-[var(--extreme-greed)]";
      if (value <= 40) return "text-[var(--extreme-greed)]";
      if (value <= 50) return "text-[var(--text-2)]";
      return "text-[var(--greed)]";
    }
    if (value >= 75) return "text-[var(--greed)]";
    if (value >= 60) return "text-[var(--greed)]";
    if (value >= 50) return "text-[var(--text-2)]";
    return "text-[var(--fear)]";
  }
  if (tab === "buy") {
    if (value > 0) return "text-[var(--greed)]";
    return "text-[var(--fear)]";
  }
  // sell: negative means the market dropped after greed (sell signal was right)
  if (value < 0) return "text-[var(--fear)]";
  return "text-[var(--greed)]";
}

function formatValue(value: number, metric: Metric): string {
  if (metric === "winRate") return `${value}%`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function TimingAnalysis({ buyData, sellData, buyPaths, sellPaths }: TimingAnalysisProps) {
  const [tab, setTab] = useState<Tab>("buy");
  const [metric, setMetric] = useState<Metric>("avg");

  const data = tab === "buy" ? buyData : sellData;
  const pathData = tab === "buy" ? buyPaths : sellPaths;

  return (
    <div
      className="rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="px-4 md:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <h2 className="font-body text-base font-semibold" style={{ color: 'var(--text-1)' }}>
            타이밍 분석
          </h2>
          {/* Buy/Sell tabs */}
          <div className="flex gap-0.5 rounded-[var(--radius-md)] p-0.5" style={{ background: 'var(--bg)' }}>
            <button
              onClick={() => setTab("buy")}
              className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-all"
              style={{
                background: tab === "buy" ? 'var(--surface)' : 'transparent',
                color: tab === "buy" ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              매수
            </button>
            <button
              onClick={() => setTab("sell")}
              className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-all"
              style={{
                background: tab === "sell" ? 'var(--surface)' : 'transparent',
                color: tab === "sell" ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              매도
            </button>
          </div>
        </div>

        {/* Metric tabs */}
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

      {/* Subheading */}
      <div className="px-4 md:px-5 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          {tab === "buy" ? `공포 ≤ ${data.threshold}` : `탐욕 ≥ ${data.threshold}`}
          {" · "}과거 {data.caseCount}회 구간 이후 자산별 성과
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-xs" style={{ color: 'var(--text-3)' }}>자산</th>
              {horizonLabels.map((h) => (
                <th key={h} className="text-center px-3 py-2.5 font-medium text-xs" style={{ color: 'var(--text-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.assets.map((asset) => (
              <tr key={asset.name} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td className="px-4 py-2.5 font-medium whitespace-nowrap font-body" style={{ color: 'var(--text-1)' }}>
                  {asset.name}
                </td>
                {horizons.map((h) => {
                  const v = asset[h][metric];
                  return (
                    <td key={h} className="px-3 py-2.5 text-center">
                      <span className={`font-data text-xs font-semibold ${cellColor(v, metric, tab)}`}>
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

      {/* Post-signal price path chart */}
      {pathData && pathData.length > 0 && (
        <div className="px-4 md:px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <PostSignalPathChart data={pathData[0]} type={tab} />
        </div>
      )}
    </div>
  );
}
