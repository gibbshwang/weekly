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
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Hero section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ScoreGauge />
        </div>
        <div className="lg:col-span-2">
          <InterpretationCard />
        </div>
      </div>

      <ComponentGrid />
      <HistoricalContext />
      <SparklineChart />
      <AssetImplications />
      <UsageGuide />
      <ProPreview />
      <EmailCTA />
    </div>
  );
}
