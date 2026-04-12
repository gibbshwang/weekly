import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResultsContainer } from '../ResultsContainer';
import type { AnalysisSections } from '@/lib/parseAnalysisStream';

const emptySections: AnalysisSections = {
  issues: [],
  statutes: '',
  precedents: '',
  lawyerQuestions: [],
  rawText: '',
};

describe('ResultsContainer', () => {
  it('renders IssueChecklist when issues exist', () => {
    const sections: AnalysisSections = {
      ...emptySections,
      issues: ['재산분할 쟁점', '양육권 쟁점'],
    };

    render(
      <ResultsContainer
        sections={sections}
        isStreaming={false}
        rawText=""
        error={null}
      />
    );

    expect(screen.getByText('재산분할 쟁점')).toBeInTheDocument();
    expect(screen.getByText('양육권 쟁점')).toBeInTheDocument();
  });

  it('renders StatuteSection when statutes text exists', () => {
    const sections: AnalysisSections = {
      ...emptySections,
      statutes: '민법 제839조',
    };

    render(
      <ResultsContainer
        sections={sections}
        isStreaming={false}
        rawText=""
        error={null}
      />
    );

    expect(screen.getByText('관련 법령')).toBeInTheDocument();
    expect(screen.getByText(/민법 제839조/)).toBeInTheDocument();
  });

  it('shows loading indicator when streaming', () => {
    render(
      <ResultsContainer
        sections={emptySections}
        isStreaming={true}
        rawText=""
        error={null}
      />
    );

    expect(screen.getByText('분석 중...')).toBeInTheDocument();
  });

  it('shows rawText as fallback when all sections are empty', () => {
    render(
      <ResultsContainer
        sections={emptySections}
        isStreaming={false}
        rawText="파싱되지 않은 원문 텍스트입니다."
        error={null}
      />
    );

    expect(screen.getByText('파싱되지 않은 원문 텍스트입니다.')).toBeInTheDocument();
  });

  it('renders SourceBadge in StatuteSection and PrecedentSection', () => {
    const sections: AnalysisSections = {
      ...emptySections,
      statutes: '민법 제839조',
      precedents: '대법원 2023다12345',
    };

    render(
      <ResultsContainer
        sections={sections}
        isStreaming={false}
        rawText=""
        error={null}
      />
    );

    const badges = screen.getAllByText('법제처 API 검색 결과');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
});
