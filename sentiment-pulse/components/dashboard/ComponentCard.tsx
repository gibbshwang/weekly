"use client";

import { DirectionBadge } from "@/components/ui/Badge";
import type { SignalReading } from "@/lib/types/kfgi";

const SCORE_COLOR: Record<string, string> = {
  extreme_fear: "var(--extreme-fear)",
  fear: "var(--fear)",
  neutral: "var(--neutral)",
  greed: "var(--greed)",
  extreme_greed: "var(--extreme-greed)",
};

function getScoreColor(score: number): string {
  if (score <= 24) return SCORE_COLOR.extreme_fear;
  if (score <= 44) return SCORE_COLOR.fear;
  if (score <= 55) return SCORE_COLOR.neutral;
  if (score <= 74) return SCORE_COLOR.greed;
  return SCORE_COLOR.extreme_greed;
}

type ComponentCardProps = Omit<SignalReading, 'key'>;

export default function ComponentCard({ label, labelEn, normalizedScore, direction, note }: ComponentCardProps) {
  const hasData = Number.isFinite(normalizedScore);

  if (!hasData) {
    return (
      <div
        className="rounded-[var(--radius-lg)] p-4 border opacity-60"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-semibold font-body" style={{ color: 'var(--text-3)' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{labelEn}</p>
          </div>
          <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--border)' }} />
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>—</span>
            <span
              className="text-xs rounded-full px-2 py-0.5 font-medium font-data"
              style={{ background: 'color-mix(in srgb, var(--warning) 15%, var(--surface))', color: 'var(--warning)' }}
            >
              데이터 없음
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 border transition-colors"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold font-body" style={{ color: 'var(--text-1)' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{labelEn}</p>
          </div>
          {direction && <DirectionBadge direction={direction} />}
        </div>

        {/* Score bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>공포</span>
            <span className="text-lg font-bold font-data" style={{ color: getScoreColor(normalizedScore) }}>{normalizedScore}</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>탐욕</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${normalizedScore}%`, background: getScoreColor(normalizedScore) }}
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{note}</p>
      </div>
    </div>
  );
}
