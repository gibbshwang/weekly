'use client';

import { LawyerCTA } from '@/components/LawyerCTA';

interface LawyerQuestionsProps {
  questions: string[];
}

export function LawyerQuestions({ questions }: LawyerQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">
        변호사에게 물어볼 질문
      </h3>
      <ol className="space-y-2 list-decimal list-inside">
        {questions.map((question, i) => (
          <li key={i} className="text-gray-700 text-base">
            {question}
          </li>
        ))}
      </ol>
      <LawyerCTA />
    </div>
  );
}
