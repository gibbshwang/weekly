import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveConsentDialog } from '../SaveConsentDialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe('SaveConsentDialog', () => {
  it('renders title "민감정보 서버 저장 동의" when open', () => {
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('민감정보 서버 저장 동의')).toBeDefined();
  });

  it('contains text about server storage with Google account', () => {
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Google 계정과 연결된 서버에 영구 저장됩니다/)).toBeDefined();
  });

  it('contains text about PIPA Article 23', () => {
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/개인정보보호법 제23조/)).toBeDefined();
  });

  it('contains text about storage purpose and no AI training', () => {
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/저장 목적: 분석 결과 재열람/)).toBeDefined();
    expect(screen.getByText(/AI 학습 사용: 없음/)).toBeDefined();
  });

  it('does NOT contain Phase 3 text "서버에 저장되지 않고"', () => {
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText(/서버에 저장되지 않고/)).toBeNull();
  });

  it('calls onConsent when "동의하고 저장하기" button is clicked', () => {
    const onConsent = vi.fn();
    render(<SaveConsentDialog open={true} onConsent={onConsent} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('동의하고 저장하기'));
    expect(onConsent).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when "취소" button is clicked', () => {
    const onCancel = vi.fn();
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <SaveConsentDialog open={false} onConsent={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('has aria-labelledby and aria-describedby attributes', () => {
    render(<SaveConsentDialog open={true} onConsent={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.getAttribute('aria-labelledby')).toBe('save-consent-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('save-consent-desc');
  });
});
