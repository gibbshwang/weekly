import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WizardContainer } from '../WizardContainer';
import { useWizardStore } from '@/stores/wizardStore';

describe('WizardContainer', () => {
  beforeEach(() => {
    useWizardStore.getState().reset();
  });

  it('renders IntroStep at step 0', () => {
    render(<WizardContainer onComplete={vi.fn()} />);

    expect(screen.getByText('이혼 법률 정보 가이드')).toBeInTheDocument();
    expect(screen.getByText('시작하기')).toBeInTheDocument();
  });

  it('renders MarriageDurationStep at step 1', () => {
    useWizardStore.getState().setStep(1);

    render(<WizardContainer onComplete={vi.fn()} />);

    expect(screen.getByText('결혼 기간')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('예: 5년, 10년 6개월')).toBeInTheDocument();
  });

  it('navigates back when 이전 button is clicked', async () => {
    const user = userEvent.setup();
    useWizardStore.getState().setStep(1);

    render(<WizardContainer onComplete={vi.fn()} />);

    expect(screen.getByText('결혼 기간')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '이전' }));

    expect(useWizardStore.getState().currentStep).toBe(0);
    expect(screen.getByText('이혼 법률 정보 가이드')).toBeInTheDocument();
  });
});
