import HookSection from "@/components/dashboard/HookSection";
import PercentileContext from "@/components/dashboard/PercentileContext";
import StoryCard from "@/components/dashboard/StoryCard";
import VerdictSection from "@/components/dashboard/VerdictSection";
import FinePrintSection from "@/components/dashboard/FinePrintSection";
import {
  getCurrentSnapshot,
  getHistoricalContext,
  getSimilarCaseReturns,
  getConsensusSummary,
  getChartPriceData,
} from "@/lib/data/dashboardData";

export default async function DashboardPage() {
  const snapshot = await getCurrentSnapshot();
  const [context, similarCases] = await Promise.all([
    getHistoricalContext(),
    getSimilarCaseReturns(),
  ]);
  const consensus = getConsensusSummary(similarCases);
  const chartData = await getChartPriceData();

  const { score, regime, change, date, vkospiRaw, signals } = snapshot;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">

      {/* ━━ 1) HOOK — 첫 뷰포트: 점수 + 행동 가이드 + 백분위/승률 한 줄 ━━ */}
      <HookSection
        score={score}
        regime={regime}
        change={change}
        date={date}
        vkospiRaw={vkospiRaw}
        percentile={context.percentile}
        winRate90d={consensus.winRate90d}
        totalCases={consensus.totalCases}
      />

      {/* ━━ 2) CONTEXT — 역사적 위치 ━━ */}
      <PercentileContext
        percentile={context.percentile}
        totalOccurrences={context.similarEvents.length}
        currentScore={score}
      />

      {/* ━━ 3) STORIES — 유사 사례 카드 ━━ */}
      {similarCases.length > 0 && (
        <section className="flex flex-col gap-4">
          <p
            className="font-mono text-[11px] tracking-[0.08em] uppercase"
            style={{ color: 'var(--text-3)' }}
          >
            가장 유사한 사례 {similarCases.length}건
          </p>
          {similarCases.map((case_, i) => (
            <StoryCard
              key={case_.date}
              case_={case_}
              currentScore={score}
              index={i}
            />
          ))}
        </section>
      )}

      {/* ━━ 4) VERDICT — 컨센서스 ━━ */}
      <VerdictSection consensus={consensus} />

      {/* ━━ 5) FINE PRINT — 접힘식 상세 데이터 ━━ */}
      <FinePrintSection signals={signals} chartData={chartData} />
    </div>
  );
}
