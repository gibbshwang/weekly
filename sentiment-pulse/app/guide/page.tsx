"use client";

import { useState } from "react";
import { Regime, interpretations } from "@/data/interpretations";
import { assetImplications, assetLabels, AssetClass } from "@/data/assetImplications";
import Link from "next/link";

const regimes: { id: Regime; shortLabel: string }[] = [
  { id: "extreme_fear", shortLabel: "극단적 공포" },
  { id: "fear", shortLabel: "공포" },
  { id: "neutral", shortLabel: "중립" },
  { id: "greed", shortLabel: "탐욕" },
  { id: "extreme_greed", shortLabel: "극단적 탐욕" },
];

const assets: AssetClass[] = ["us_equity", "bonds_usd", "kr_equity", "crypto"];

const regimeRanges: Record<Regime, string> = {
  extreme_fear: "0–20",
  fear: "21–40",
  neutral: "41–60",
  greed: "61–80",
  extreme_greed: "81–100",
};

export default function GuidePage() {
  const [selected, setSelected] = useState<Regime>("fear");
  const info = interpretations[selected];
  const implications = assetImplications[selected];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-white">가이드</h1>
        <p className="text-sm text-gray-500 mt-1">레짐별 해석 및 활용 프레임</p>
      </div>

      {/* Regime tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
        {regimes.map((r) => {
          const rInfo = interpretations[r.id];
          const isSelected = selected === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className="flex-1 min-w-fit px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
              style={
                isSelected
                  ? { backgroundColor: rInfo.color + "22", color: rInfo.color, border: `1px solid ${rInfo.color}44` }
                  : { color: "#6b7280" }
              }
            >
              {r.shortLabel}
              <span className="block text-xs opacity-60">{regimeRanges[r.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Selected regime content */}
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div
          className="rounded-xl p-4 md:p-6 border"
          style={{ backgroundColor: info.color + "11", borderColor: info.color + "33" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
            <h2 className="text-xl font-black" style={{ color: info.color }}>{info.label}</h2>
            <span className="text-sm text-gray-500">({regimeRanges[selected]})</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{info.interpretation}</p>
          <p className="text-xs text-gray-500 mt-2">{info.drivingFactors}</p>
        </div>

        {/* Usage points */}
        <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-4">활용 프레임</h3>
          <div className="flex flex-col gap-3">
            {info.usagePoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: info.color }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Asset implications */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">자산별 함의</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assets.map((asset) => {
              const { label, emoji } = assetLabels[asset];
              const { pattern, usageNote } = implications[asset];
              return (
                <div key={asset} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{emoji}</span>
                    <span className="text-sm font-bold text-white">{label}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">{pattern}</p>
                  <p className="text-xs text-gray-500 border-t border-gray-800 pt-2 leading-relaxed">{usageNote}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Watch for */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            주목할 신호 (Watch For)
          </h3>
          <div className="flex flex-col gap-2">
            {info.watchFor.map((signal, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-yellow-500 text-sm">→</span>
                <span className="text-sm text-gray-300">{signal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro persona preview */}
        <div className="relative rounded-xl border border-amber-800/30 overflow-hidden">
          <div className="filter blur-sm pointer-events-none select-none bg-gray-900 p-4 md:p-6">
            <h3 className="text-sm font-bold text-white mb-3">성향별 맞춤 프레임</h3>
            <div className="grid grid-cols-3 gap-3">
              {["보수적 투자자", "균형 투자자", "공격적 투자자"].map((p) => (
                <div key={p} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs font-bold text-white mb-1">{p}</p>
                  <p className="text-xs text-gray-500">████████████████</p>
                  <p className="text-xs text-gray-600 mt-1">████████████</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center gap-3 p-4">
            <span className="text-amber-400 font-bold text-sm">🔒 PRO 전용</span>
            <p className="text-xs text-gray-400 text-center">투자 성향별 맞춤 프레임</p>
            <Link href="/subscribe" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors">
              PRO 시작하기
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-800">
          <p className="text-xs text-gray-600 leading-relaxed">
            위 내용은 역사적 패턴 분석에 기반한 일반적 관찰이며, 개인 투자 권유가 아닙니다.
            과거의 패턴이 미래 수익을 보장하지 않습니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
