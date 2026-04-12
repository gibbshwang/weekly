import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/wizard/WizardContainer', () => ({
  WizardContainer: ({ onComplete }: { onComplete: (s: any) => void }) => (
    <div data-testid="wizard-container">
      <button
        onClick={() =>
          onComplete({
            marriageDuration: '5년',
            hasChildren: false,
            divorceReason: '성격 차이',
          })
        }
      >
        완료
      </button>
    </div>
  ),
}));

vi.mock('@/components/results/ResultsContainer', () => ({
  ResultsContainer: () => <div data-testid="results-container">결과 표시</div>,
}));

vi.mock('@/hooks/useAnalysisStream', () => ({
  useAnalysisStream: () => ({
    sections: {
      issues: [],
      statutes: '',
      precedents: '',
      lawyerQuestions: [],
      rawText: '',
    },
    rawText: '',
    isStreaming: false,
    error: null,
    startAnalysis: vi.fn(),
  }),
}));

const mockReset = vi.fn();
vi.mock('@/stores/wizardStore', () => ({
  useWizardStore: Object.assign(() => ({}), {
    getState: () => ({ reset: mockReset }),
  }),
}));

import WizardPage from '../page';

describe('WizardPage', () => {
  beforeEach(() => {
    mockReset.mockClear();
  });

  it('renders WizardContainer initially, not ResultsContainer', () => {
    render(<WizardPage />);

    expect(screen.getByTestId('wizard-container')).toBeInTheDocument();
    expect(screen.queryByTestId('results-container')).not.toBeInTheDocument();
  });

  it('shows ResultsContainer after onComplete', async () => {
    const user = userEvent.setup();
    render(<WizardPage />);

    await user.click(screen.getByText('완료'));

    expect(screen.getByTestId('results-container')).toBeInTheDocument();
    expect(screen.queryByTestId('wizard-container')).not.toBeInTheDocument();
  });

  it('returns to WizardContainer when 다시 시작하기 is clicked', async () => {
    const user = userEvent.setup();
    render(<WizardPage />);

    await user.click(screen.getByText('완료'));
    expect(screen.getByTestId('results-container')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 시작하기' }));

    expect(screen.getByTestId('wizard-container')).toBeInTheDocument();
    expect(screen.queryByTestId('results-container')).not.toBeInTheDocument();
  });

  it('calls wizardStore.reset when 다시 시작하기 is clicked', async () => {
    const user = userEvent.setup();
    render(<WizardPage />);

    await user.click(screen.getByText('완료'));
    await user.click(screen.getByRole('button', { name: '다시 시작하기' }));

    expect(mockReset).toHaveBeenCalled();
  });
});
