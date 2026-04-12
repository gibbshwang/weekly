import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DivorceReasonStep } from '../DivorceReasonStep';
import { SafetyBranch } from '../SafetyBranch';
import { useWizardStore } from '@/stores/wizardStore';

describe('DivorceReasonStep', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('sets isDvDetected to true when DV keyword is submitted', async () => {
    const user = userEvent.setup();
    render(<DivorceReasonStep onNext={() => {}} onBack={() => {}} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '남편이 폭력을 행사합니다');
    fireEvent.submit(textarea.closest('form')!);
    await waitFor(() => {
      expect(useWizardStore.getState().isDvDetected).toBe(true);
    });
  });

  it('sets isDvDetected to false for non-DV reason', async () => {
    const user = userEvent.setup();
    render(<DivorceReasonStep onNext={() => {}} onBack={() => {}} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '성격 차이');
    fireEvent.submit(textarea.closest('form')!);
    await waitFor(() => {
      expect(useWizardStore.getState().isDvDetected).toBe(false);
    });
  });
});

describe('SafetyBranch', () => {
  it('renders continue button', () => {
    render(<SafetyBranch onContinue={() => {}} />);
    expect(screen.getByText(/안전한 상황/)).toBeDefined();
  });
});
