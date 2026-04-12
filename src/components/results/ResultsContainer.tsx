'use client';

import type { AnalysisSections } from '@/lib/parseAnalysisStream';
import { IssueChecklist } from './IssueChecklist';
import { StatuteSection } from './StatuteSection';
import { PrecedentSection } from './PrecedentSection';
import { LawyerQuestions } from './LawyerQuestions';

interface ResultsContainerProps {
  sections: AnalysisSections;
  isStreaming: boolean;
  rawText: string;
  error: string | null;
}

export function ResultsContainer({
  sections,
  isStreaming,
  rawText,
  error,
}: ResultsContainerProps) {
  const hasSections =
    sections.issues.length > 0 ||
    sections.statutes ||
    sections.precedents ||
    sections.lawyerQuestions.length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-2 text-[#1B6B5A]">
          <div className="w-2 h-2 bg-[#1B6B5A] rounded-full animate-pulse" />
          <span className="text-sm font-medium">분석 중...</span>
        </div>
      )}

      {hasSections ? (
        <div className="bg-white rounded-xl p-6 space-y-6 border border-gray-200">
          <IssueChecklist issues={sections.issues} />
          <StatuteSection content={sections.statutes} />
          <PrecedentSection content={sections.precedents} />
          <LawyerQuestions questions={sections.lawyerQuestions} />

          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
            이 결과는 법률 정보 제공이며, 법률 자문이 아닙니다.
          </p>
        </div>
      ) : rawText ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">{rawText}</p>
        </div>
      ) : null}
    </div>
  );
}
