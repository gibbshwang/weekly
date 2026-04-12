import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LawyerCTA } from '../LawyerCTA';

describe('LawyerCTA', () => {
  it('renders lawyer consultation recommendation', () => {
    render(<LawyerCTA />);
    expect(screen.getByText('변호사 상담을 권유합니다')).toBeDefined();
  });

  it('links to 대한법률구조공단 with external attributes', () => {
    render(<LawyerCTA />);
    const link = screen.getByText('대한법률구조공단');
    expect(link.getAttribute('href')).toBe('https://www.klac.or.kr');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('includes 132 hotline tel link', () => {
    render(<LawyerCTA />);
    const link = screen.getByText(/132/);
    expect(link.getAttribute('href')).toBe('tel:132');
  });
});
