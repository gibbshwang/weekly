import ScoreGauge from "@/components/dashboard/ScoreGauge";
import InterpretationCard from "@/components/dashboard/InterpretationCard";
import ComponentGrid from "@/components/dashboard/ComponentGrid";
import HistoricalContext from "@/components/dashboard/HistoricalContext";
import SparklineChart from "@/components/dashboard/SparklineChart";
import AssetImplications from "@/components/dashboard/AssetImplications";
import UsageGuide from "@/components/dashboard/UsageGuide";
import ProPreview from "@/components/dashboard/ProPreview";
import EmailCTA from "@/components/dashboard/EmailCTA";

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* Page framing */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white tracking-tight">시장 심리 지수</h1>
        <p className="text-sm text-gray-500">
          지금 시장 심리가 어디에 있는지, 그리고 어떻게 활용할지 한 화면에서 확인하세요.
        </p>
      </div>

      {/* Hero — score + interpretation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ScoreGauge />
        </div>
        <div className="lg:col-span-2">
          <InterpretationCard />
        </div>
      </div>

      {/* Usage frame — the "so what?" — placed high */}
      <UsageGuide />

      {/* Supporting detail */}
      <ComponentGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HistoricalContext />
        <SparklineChart />
      </div>

      <AssetImplications />
      <ProPreview />
      <EmailCTA />
    </div>
  );
}
