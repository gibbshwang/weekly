import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyNotice } from '../PrivacyNotice';

describe('PrivacyNotice', () => {
  it('renders privacy text about no AI training and no server storage', () => {
    render(<PrivacyNotice />);
    expect(screen.getByText(/AI 모델 학습에 사용되지 않습니다/)).toBeDefined();
    expect(screen.getByText(/브라우저를 닫으면 삭제됩니다/)).toBeDefined();
  });
});
