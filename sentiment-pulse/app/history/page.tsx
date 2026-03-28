import Link from "next/link";
import { getHistory, getHistoricalContext } from "@/lib/data/dashboardData";
import HistoryChart from "@/components/history/HistoryChart";
import type { HistoricalEvent } from "@/lib/types/kfgi";

const REGIME_COLORS: Record<string, string> = {
  extreme_fear: "#dc2626",
  fear: "#ef4444",
  neutral: "#6b7280",
  greed: "#22c55e",
  extreme_greed: "#d97706",
};

function getScoreColor(score: number): string {
  if (score <= 20) return REGIME_COLORS.extreme_fear;
  if (score <= 40) return REGIME_COLORS.fear;
  if (score <= 60) return REGIME_COLORS.neutral;
  if (score <= 80) return REGIME_COLORS.greed;
  return REGIME_COLORS.extreme_greed;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function HistoryPage() {
  const history = await getHistory();
  const context = await getHistoricalContext();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-white">히스토리</h1>
        <p className="text-sm text-gray-500 mt-1">Korea Fear & Greed Index 과거 데이터</p>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
        <h2 className="text-base font-bold text-white mb-4">심리 지수 추이 (최근 30일)</h2>
        <HistoryChart data={history} />
      </div>

      {/* Similar events table */}
      <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">유사 구간 사례</h2>
          <span className="text-xs text-gray-500">현재 점수 기준 ±15점</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="text-left pb-3 pr-4">날짜</th>
                <th className="text-left pb-3 pr-4">이벤트</th>
                <th className="text-center pb-3 pr-4">점수</th>
                <th className="text-left pb-3">설명</th>
              </tr>
            </thead>
            <tbody>
              {context.similarEvents.map((event: HistoricalEvent, i: number) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{formatDate(event.date)}</td>
                  <td className="py-3 pr-4 text-white font-medium">{event.label}</td>
                  <td className="py-3 pr-4 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: getScoreColor(event.score) }}
                    >
                      {event.score}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">{event.note}</td>
                </tr>
              ))}
              {context.similarEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    현재 점수와 유사한 과거 사례가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
