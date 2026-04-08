"use client";

import type { SimilarCaseWithReturns } from '@/lib/types/narrative';
import type { PostSignalPathData } from '@/lib/types/charts';
import PostSignalPathChart from './PostSignalPathChart';
import ReturnGrid from './ReturnGrid';
import { getScoreColor } from '@/lib/constants/regime';

interface StoryCardProps {
  case_: SimilarCaseWithReturns;
  currentScore: number;
  index: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function StoryCard({ case_, currentScore, index }: StoryCardProps) {
  const scoreDiff = Math.abs(currentScore - case_.score);
  const scoreColor = getScoreColor(case_.score);

  // Adapt pricePath to PostSignalPathData format for the mini chart (filter null points)
  const chartData: PostSignalPathData = {
    asset: 'KOSPI',
    points: case_.pricePath.filter((p): p is { day: number; avgReturn: number } => p.avgReturn !== null),
  };

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 md:p-5 border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${scoreColor} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${scoreColor} 30%, transparent)`,
            }}
          >
            <span className="text-xs font-bold font-data" style={{ color: scoreColor }}>{case_.score}</span>
          </div>
          <div>
            <p className="text-sm font-semibold font-body" style={{ color: 'var(--text-1)' }}>
              {case_.label ?? `사례 ${index + 1}`}
            </p>
            <p className="text-xs font-data" style={{ color: 'var(--text-3)' }}>
              {formatDate(case_.date)} · 현재와 {scoreDiff}pt 차이
            </p>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-3)' }}>
        {case_.note}
      </p>

      {/* Mini chart: KOSPI price path after signal */}
      <div className="mb-4">
        <PostSignalPathChart data={chartData} color={scoreColor} />
      </div>

      {/* Return grid: 4 assets × 3 periods */}
      <ReturnGrid returns={case_.returns} />
    </div>
  );
}
