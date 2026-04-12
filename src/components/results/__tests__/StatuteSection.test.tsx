import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatuteSection } from '../StatuteSection';

describe('StatuteSection', () => {
  it('renders statute name and article number from content', () => {
    render(
      <StatuteSection content="민법 제839조(재산분할청구권)\n혼인 중 쌍방의 협력으로 이룬 재산에 대하여 분할을 청구할 수 있다." />
    );

    expect(screen.getByText(/민법/)).toBeInTheDocument();
    expect(screen.getByText(/제839조/)).toBeInTheDocument();
  });

  it('renders 관련 법령 title with SourceBadge', () => {
    render(<StatuteSection content="민법 제839조" />);

    expect(screen.getByText('관련 법령')).toBeInTheDocument();
    expect(screen.getByText('법제처 API 검색 결과')).toBeInTheDocument();
  });

  it('renders nothing when content is empty', () => {
    const { container } = render(<StatuteSection content="" />);
    expect(container.innerHTML).toBe('');
  });
});
