import ScoreGauge from "@/components/dashboard/ScoreGauge";
import InterpretationCard from "@/components/dashboard/InterpretationCard";
import ComponentGrid from "@/components/dashboard/ComponentGrid";
import BuyTimingAnalysis from "@/components/dashboard/BuyTimingAnalysis";
import SellTimingAnalysis from "@/components/dashboard/SellTimingAnalysis";
import CrossAssetHeatmap from "@/components/dashboard/CrossAssetHeatmap";
import HistoricalContext from "@/components/dashboard/HistoricalContext";
import SparklineChart from "@/components/dashboard/SparklineChart";
import ContextChart from "@/components/dashboard/ContextChart";
import MethodologyDisclaimer from "@/components/dashboard/MethodologyDisclaimer";
import ProPreview from "@/components/dashboard/ProPreview";
import EmailCTA from "@/components/dashboard/EmailCTA";
import { interpretations } from "@/data/interpretations";
import {
  getCurrentSnapshot,
  getHistory,
  getBuyTiming,
  getSellTiming,
  getHeatmap,
  getHistoricalContext,
} from "@/lib/data/dashboardData";
import { getKfgiPriceData } from "@/lib/data/chartData";

export default function DashboardPage() {
  const snapshot = getCurrentSnapshot();
  const history = getHistory();
  const buyTiming = getBuyTiming();
  const sellTiming = getSellTiming();
  const heatmap = getHeatmap();
  const context = getHistoricalContext();
  const chartData = getKfgiPriceData();

  const { score, regime, change, date, vkospiRaw, signals } = snapshot;
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
          <ScoreGauge score={score} regime={regime} change={change} vkospiRaw={vkospiRaw} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <InterpretationCard regime={regime} />
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

      {/* ── Context chart: K-FGI vs asset price ── */}
      <ContextChart data={chartData} />

      {/* ── 7 signals today ── */}
      <ComponentGrid signals={signals} />

      {/* ── Buy timing analysis ── */}
      <BuyTimingAnalysis data={buyTiming} />

      {/* ── Sell timing analysis ── */}
      <SellTimingAnalysis data={sellTiming} />

      {/* ── Cross-asset heatmap ── */}
      <CrossAssetHeatmap data={heatmap} />

      {/* ── Historical context ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SparklineChart history={history} />
        <HistoricalContext data={context} />
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
