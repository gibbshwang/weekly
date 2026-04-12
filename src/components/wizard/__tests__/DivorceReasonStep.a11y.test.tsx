import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DivorceReasonStep } from '../DivorceReasonStep';
import { WizardContainer } from '../WizardContainer';
import { useWizardStore } from '@/stores/wizardStore';

const QUICK_OPTIONS = ['성격 차이', '경제적 문제', '외도/부정행위', '가정폭력', '기타'];

describe('DivorceReasonStep accessibility', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('quick option buttons have min-h-[48px] touch target', () => {
    const { container } = render(
      <DivorceReasonStep onNext={vi.fn()} onBack={vi.fn()} />
    );
    const quickButtons = container.querySelectorAll('.flex.flex-wrap button');
    expect(quickButtons.length).toBe(QUICK_OPTIONS.length);
    quickButtons.forEach((button) => {
      expect(button.className).toContain('min-h-[48px]');
    });
  });

  it('quick option buttons have descriptive aria-labels', () => {
    render(<DivorceReasonStep onNext={vi.fn()} onBack={vi.fn()} />);
    QUICK_OPTIONS.forEach((option) => {
      expect(screen.getByLabelText(`이혼 사유 추가: ${option}`)).toBeDefined();
    });
  });

  it('renders all 5 quick option buttons', () => {
    render(<DivorceReasonStep onNext={vi.fn()} onBack={vi.fn()} />);
    QUICK_OPTIONS.forEach((option) => {
      expect(screen.getByText(option)).toBeDefined();
    });
  });
});

describe('WizardContainer responsive layout', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('wizard wrapper uses max-w-lg responsive pattern without fixed widths', () => {
    useWizardStore.getState().setStep(4); // DivorceReasonStep
    const { container } = render(
      <WizardContainer onComplete={vi.fn()} />
    );
    // Check that max-w-lg exists in step content
    const maxWElement = container.querySelector('.max-w-lg');
    expect(maxWElement).not.toBeNull();

    // Ensure no fixed width patterns like w-[500px] exist
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const className = el.className;
      if (typeof className === 'string') {
        expect(className).not.toMatch(/w-\[\d+px\]/);
      }
    });
  });
});
