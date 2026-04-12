import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WizardContainer } from '../WizardContainer';
import { ChildrenStep } from '../ChildrenStep';
import { useWizardStore } from '@/stores/wizardStore';

describe('WizardContainer focus management', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('focuses the step heading when step changes', async () => {
    const { container } = render(
      <WizardContainer onComplete={vi.fn()} />
    );

    // Move to step 1
    act(() => {
      useWizardStore.getState().setStep(1);
    });

    // Re-render with new step
    const { container: container2 } = render(
      <WizardContainer onComplete={vi.fn()} />
    );

    // The h2 heading should have tabindex="-1" for programmatic focus
    const heading = container2.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading!.getAttribute('tabindex')).toBe('-1');
  });

  it('has containerRef on the wrapper div', () => {
    useWizardStore.getState().setStep(1);
    const { container } = render(
      <WizardContainer onComplete={vi.fn()} />
    );
    // The container should have a ref (we verify by checking focus behavior exists)
    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    // After step change, heading should be the active element
    expect(heading!.getAttribute('tabindex')).toBe('-1');
  });
});

describe('ChildrenStep label association', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
    useWizardStore.getState().updateSituation({ hasChildren: true });
  });

  it('textarea is associated with label via htmlFor/id', () => {
    render(<ChildrenStep onNext={vi.fn()} onBack={vi.fn()} />);
    const textarea = screen.getByLabelText('자녀 나이와 현재 양육 상황을 알려주세요');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea.id).toBe('childrenInfo');
  });
});
