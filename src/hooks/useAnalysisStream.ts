'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  parseAnalysisSections,
  type AnalysisSections,
} from '@/lib/parseAnalysisStream';
import type { UserSituation } from '@/types/analysis';

const EMPTY_SECTIONS: AnalysisSections = {
  issues: [],
  statutes: '',
  precedents: '',
  lawyerQuestions: [],
  rawText: '',
};

export interface UseAnalysisStreamReturn {
  sections: AnalysisSections;
  rawText: string;
  isStreaming: boolean;
  error: string | null;
  startAnalysis: (situation: UserSituation) => Promise<void>;
}

export function useAnalysisStream(): UseAnalysisStreamReturn {
  const { user } = useAuth();
  const [sections, setSections] = useState<AnalysisSections>(EMPTY_SECTIONS);
  const [rawText, setRawText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(
    async (situation: UserSituation) => {
      setError(null);
      setSections(EMPTY_SECTIONS);
      setRawText('');

      if (!user) {
        setError('인증이 필요합니다.');
        return;
      }

      setIsStreaming(true);

      try {
        const idToken = await user.getIdToken();

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(situation),
        });

        if (!response.ok) {
          setError('분석 요청에 실패했습니다.');
          setIsStreaming(false);
          return;
        }

        if (!response.body) {
          setError('분석 응답을 읽을 수 없습니다.');
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          setRawText(buffer);

          const parsed = parseAnalysisSections(buffer);
          setSections(parsed);
        }
      } catch (e) {
        setError('분석 중 오류가 발생했습니다.');
      } finally {
        setIsStreaming(false);
      }
    },
    [user]
  );

  return { sections, rawText, isStreaming, error, startAnalysis };
}
