import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DisclaimerBanner } from '../DisclaimerBanner';

describe('DisclaimerBanner', () => {
  it('renders disclaimer text', () => {
    render(<DisclaimerBanner />);
    expect(screen.getByText(/법률 자문이 아닙니다/)).toBeInTheDocument();
  });

  it('has alert role for accessibility', () => {
    render(<DisclaimerBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('includes lawyer consultation guidance text', () => {
    render(<DisclaimerBanner />);
    expect(screen.getByText(/변호사와 상담/)).toBeInTheDocument();
  });
});
