import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PipaConsentDialog } from '../PipaConsentDialog';
import { WizardContainer } from '../WizardContainer';
import { useWizardStore } from '@/stores/wizardStore';

// Mock HTMLDialogElement methods for jsdom
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('PipaConsentDialog', () => {
  it('shows "민감정보 처리 동의" title when open', () => {
    render(<PipaConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('민감정보 처리 동의')).toBeDefined();
  });

  it('calls onConsent when "동의하고 계속하기" is clicked', async () => {
    const user = userEvent.setup();
    const onConsent = vi.fn();
    render(<PipaConsentDialog open={true} onConsent={onConsent} onCancel={vi.fn()} />);
    await user.click(screen.getByText('동의하고 계속하기'));
    expect(onConsent).toHaveBeenCalledOnce();
  });

  it('calls onCancel when "취소" is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PipaConsentDialog open={true} onConsent={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <PipaConsentDialog open={false} onConsent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.querySelector('dialog')).toBeNull();
  });
});

describe('wizardStore pipaConsented', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('pipaConsented initial value is false', () => {
    expect(useWizardStore.getState().pipaConsented).toBe(false);
  });

  it('setPipaConsented(true) sets pipaConsented to true', () => {
    useWizardStore.getState().setPipaConsented(true);
    expect(useWizardStore.getState().pipaConsented).toBe(true);
  });

  it('reset() resets pipaConsented to false', () => {
    useWizardStore.getState().setPipaConsented(true);
    useWizardStore.getState().reset();
    expect(useWizardStore.getState().pipaConsented).toBe(false);
  });
});

describe('WizardContainer PIPA gate', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it('shows PIPA dialog when navigating from step 3 to 4 without consent', async () => {
    const user = userEvent.setup();
    useWizardStore.getState().setStep(3);

    render(<WizardContainer onComplete={vi.fn()} />);

    // AssetStep's "다음" button should trigger PIPA dialog
    const nextButton = screen.getByRole('button', { name: '다음' });
    await user.click(nextButton);

    // Should show PIPA consent dialog, NOT advance to step 4
    expect(screen.getByText('민감정보 처리 동의')).toBeDefined();
    expect(useWizardStore.getState().currentStep).toBe(3);
  });

  it('proceeds to step 4 when pipaConsented is true', async () => {
    const user = userEvent.setup();
    useWizardStore.getState().setStep(3);
    useWizardStore.getState().setPipaConsented(true);

    render(<WizardContainer onComplete={vi.fn()} />);

    const nextButton = screen.getByRole('button', { name: '다음' });
    await user.click(nextButton);

    // Should advance to step 4 (DivorceReasonStep)
    expect(useWizardStore.getState().currentStep).toBe(4);
  });
});
