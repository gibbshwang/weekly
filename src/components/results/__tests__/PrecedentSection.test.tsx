import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrecedentSection } from '../PrecedentSection';

describe('PrecedentSection', () => {
  it('renders case number and date from content', () => {
    render(
      <PrecedentSection content="대법원 2023. 6. 15. 선고 2023다12345 판결\n이혼에 있어 재산분할은 혼인 중 형성된 재산을 대상으로 한다." />
    );

    expect(screen.getByText(/2023다12345/)).toBeInTheDocument();
    expect(screen.getByText(/2023\. 6\. 15\./)).toBeInTheDocument();
  });

  it('renders 관련 판례 title with SourceBadge', () => {
    render(<PrecedentSection content="대법원 2023다12345" />);

    expect(screen.getByText('관련 판례')).toBeInTheDocument();
    expect(screen.getByText('법제처 API 검색 결과')).toBeInTheDocument();
  });

  it('renders nothing when content is empty', () => {
    const { container } = render(<PrecedentSection content="" />);
    expect(container.innerHTML).toBe('');
  });
});
