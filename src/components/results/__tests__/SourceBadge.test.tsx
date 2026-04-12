import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SourceBadge } from '../SourceBadge';

describe('SourceBadge', () => {
  it('renders 법제처 API 검색 결과 text', () => {
    render(<SourceBadge />);
    expect(screen.getByText('법제처 API 검색 결과')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SourceBadge className="mt-2" />);
    const badge = screen.getByText('법제처 API 검색 결과');
    expect(badge.className).toContain('mt-2');
  });
});
