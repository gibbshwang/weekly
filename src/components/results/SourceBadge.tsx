'use client';

interface SourceBadgeProps {
  className?: string;
}

export function SourceBadge({ className }: SourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[#1B6B5A] bg-[#1B6B5A]/10 rounded-full${className ? ` ${className}` : ''}`}
    >
      법제처 API 검색 결과
    </span>
  );
}
