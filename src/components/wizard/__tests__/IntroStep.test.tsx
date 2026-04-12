import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntroStep } from '../IntroStep';
import { WizardProgress } from '../WizardProgress';

describe('IntroStep', () => {
  it('renders lawyer consultation preparation text (INTAKE-04)', () => {
    render(<IntroStep onNext={() => {}} />);
    expect(screen.getByText(/변호사 상담/)).toBeDefined();
  });

  it('renders disclaimer text', () => {
    render(<IntroStep onNext={() => {}} />);
    expect(screen.getByText(/법률 자문이 아닙니다/)).toBeDefined();
  });

  it('calls onNext when start button is clicked', () => {
    const onNext = vi.fn();
    render(<IntroStep onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /시작/ }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});

describe('WizardProgress', () => {
  it('renders progress bar with correct width for current=2, total=5', () => {
    const { container } = render(<WizardProgress current={2} total={5} />);
    const bar = container.querySelector('[data-testid="progress-bar"]');
    expect(bar).toBeDefined();
    expect((bar as HTMLElement).style.width).toBe('40%');
  });
});
