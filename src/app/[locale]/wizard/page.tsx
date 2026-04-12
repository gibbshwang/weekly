'use client';

import { useState, useCallback } from 'react';
import { WizardContainer } from '@/components/wizard/WizardContainer';
import { ResultsContainer } from '@/components/results/ResultsContainer';
import { useAnalysisStream } from '@/hooks/useAnalysisStream';
import { useWizardStore } from '@/stores/wizardStore';
import type { UserSituation } from '@/types/analysis';

export default function WizardPage() {
  const [showResults, setShowResults] = useState(false);
  const { sections, rawText, isStreaming, error, startAnalysis } =
    useAnalysisStream();

  const handleComplete = useCallback(
    (situation: UserSituation) => {
      setShowResults(true);
      startAnalysis(situation);
    },
    [startAnalysis]
  );

  const handleRestart = useCallback(() => {
    setShowResults(false);
    useWizardStore.getState().reset();
  }, []);

  if (!showResults) {
    return <WizardContainer onComplete={handleComplete} />;
  }

  return (
    <div>
      <ResultsContainer
        sections={sections}
        isStreaming={isStreaming}
        rawText={rawText}
        error={error}
      />
      {!isStreaming && (
        <div className="max-w-lg mx-auto px-4 pb-8">
          <button
            onClick={handleRestart}
            className="w-full py-3 border border-[#1B6B5A] text-[#1B6B5A] rounded-lg font-medium min-h-[48px] hover:bg-[#F0FAF7] transition-colors"
          >
            다시 시작하기
          </button>
        </div>
      )}
    </div>
  );
}
