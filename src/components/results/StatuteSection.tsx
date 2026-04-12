'use client';

import { SourceBadge } from './SourceBadge';

interface StatuteSectionProps {
  content: string;
}

export function StatuteSection({ content }: StatuteSectionProps) {
  if (!content) return null;

  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-bold text-gray-900">관련 법령</h3>
        <SourceBadge />
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <p key={i} className="text-gray-700 text-base leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
