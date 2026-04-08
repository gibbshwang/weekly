"use client";

import { useState } from "react";
import { componentDescriptions } from "@/data/componentDescriptions";

const signals = Object.values(componentDescriptions);

export default function MethodologyDisclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 md:px-5 py-4 flex items-center justify-between text-left"
        style={{ borderBottom: open ? '1px solid var(--border)' : 'none' }}
      >
        <div>
          <h2 className="font-body text-base font-semibold" style={{ color: 'var(--text-1)' }}>산출 방법론</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Fear & Greed Index 7개 시그널 정의 및 합성 방법</p>
        </div>
        <svg
          className="w-5 h-5 transition-transform flex-shrink-0"
          style={{ color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 md:px-5 py-4 flex flex-col gap-4">
          {/* 7 signal definitions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {signals.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-[var(--radius-md)] p-3 border"
                style={{ background: 'var(--bg)', borderColor: 'var(--border-subtle)' }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-data mt-0.5"
                  style={{ background: 'var(--border)', color: 'var(--text-2)' }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold font-body" style={{ color: 'var(--text-1)' }}>{s.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{s.description}</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>산식: {s.formula}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Methodology notes */}
          <div className="flex flex-col gap-2 text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
            <p><span className="font-medium" style={{ color: 'var(--text-2)' }}>정규화:</span> 각 시그널의 원시값을 과거 분포 기준 0–100 범위로 변환합니다. 0은 극단적 공포, 100은 극단적 탐욕입니다.</p>
            <p><span className="font-medium" style={{ color: 'var(--text-2)' }}>합성 점수:</span> 7개 시그널의 동일 가중 평균으로 Fear & Greed 종합 점수를 산출합니다.</p>
            <p><span className="font-medium" style={{ color: 'var(--text-2)' }}>레짐 구간:</span> 0–20 극단적 공포 · 21–40 공포 · 41–60 중립 · 61–80 탐욕 · 81–100 극단적 탐욕</p>
          </div>

          {/* Disclaimer */}
          <div
            className="p-3 rounded-[var(--radius-md)] border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
              본 분석은 교육 및 정보 제공 목적이며, 투자 권유가 아닙니다.
              과거의 패턴이 미래 수익을 보장하지 않습니다.
              표본이 작은 극단 구간에서는 통계적 신뢰도가 낮을 수 있습니다.
              투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
