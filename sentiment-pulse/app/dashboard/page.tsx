import ScoreGauge from "@/components/dashboard/ScoreGauge";
import InterpretationCard from "@/components/dashboard/InterpretationCard";
import ComponentGrid from "@/components/dashboard/ComponentGrid";
import BuyTimingAnalysis from "@/components/dashboard/BuyTimingAnalysis";
import SellTimingAnalysis from "@/components/dashboard/SellTimingAnalysis";
import CrossAssetHeatmap from "@/components/dashboard/CrossAssetHeatmap";
import HistoricalContext from "@/components/dashboard/HistoricalContext";
import SparklineChart from "@/components/dashboard/SparklineChart";
import MethodologyDisclaimer from "@/components/dashboard/MethodologyDisclaimer";
import ProPreview from "@/components/dashboard/ProPreview";
import EmailCTA from "@/components/dashboard/EmailCTA";
import { mockScore } from "@/data/mockData";
import { interpretations } from "@/data/interpretations";

export default function DashboardPage() {
  const { score, regime, change, date } = mockScore;
  const info = interpretations[regime];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* ── Briefing headline ── */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">
          {date} 기준 · K-FGI 시장 심리 브리핑
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
          시장은 지금{" "}
          <span style={{ color: info.color }}>{info.label}</span>{" "}
          구간입니다
        </h1>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-2xl">
          {info.interpretation}
        </p>
      </div>

      {/* ── Hero: score + driving factors + key action ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ScoreGauge />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <InterpretationCard />
          {/* Inline action strip — the "so what" */}
          <div
            className="rounded-lg px-4 py-3 border flex items-start gap-3"
            style={{
              backgroundColor: `color-mix(in srgb, ${info.color} 6%, #111827)`,
              borderColor: `color-mix(in srgb, ${info.color} 20%, #1f2937)`,
            }}
          >
            <span className="text-base mt-0.5" style={{ color: info.color }}>→</span>
            <div>
              <p className="text-sm font-semibold text-white">{info.usagePoints[0]}</p>
              {info.usagePoints[1] && (
                <p className="text-xs text-gray-400 mt-1">{info.usagePoints[1]}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 7 signals today ── */}
      <ComponentGrid />

      {/* ── Buy timing analysis ── */}
      <BuyTimingAnalysis />

      {/* ── Sell timing analysis ── */}
      <SellTimingAnalysis />

      {/* ── Cross-asset heatmap ── */}
      <CrossAssetHeatmap />

      {/* ── Historical context ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SparklineChart />
        <HistoricalContext />
      </div>

      {/* ── Methodology & disclaimer ── */}
      <MethodologyDisclaimer />

      {/* ── Pro + subscription (non-interrupting, at bottom) ── */}
      <div className="flex flex-col gap-4 mt-2">
        <ProPreview />
        <EmailCTA />
      </div>
    </div>
  );
}
