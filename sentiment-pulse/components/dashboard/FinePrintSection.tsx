"use client";

import { useState } from "react";
import type { SignalReading } from "@/lib/types/kfgi";
import type { KfgiPriceData } from "@/lib/types/charts";
import ComponentGrid from "./ComponentGrid";
import ContextChart from "./ContextChart";
import MethodologyDisclaimer from "./MethodologyDisclaimer";

interface FinePrintSectionProps {
  signals: SignalReading[];
  chartData: KfgiPriceData;
}

function CollapsibleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 md:px-5 py-4 flex items-center justify-between text-left"
      >
        <div>
          <h3 className="font-body text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
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
        <div className="px-4 md:px-5 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

export default function FinePrintSection({ signals, chartData }: FinePrintSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <p
        className="font-mono text-[11px] tracking-[0.08em] uppercase"
        style={{ color: 'var(--text-3)' }}
      >
        상세 데이터
      </p>

      <CollapsibleSection
        title="7대 시그널 상세"
        subtitle="K-FGI를 구성하는 7개 시그널의 개별 점수"
      >
        <ComponentGrid signals={signals} />
      </CollapsibleSection>

      <CollapsibleSection
        title="K-FGI vs 자산가격 차트"
        subtitle="K-FGI 지수와 주요 자산가격의 상관관계"
      >
        <ContextChart data={chartData} />
      </CollapsibleSection>

      <MethodologyDisclaimer />
    </section>
  );
}
