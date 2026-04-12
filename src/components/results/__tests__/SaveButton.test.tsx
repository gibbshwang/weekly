import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSaveStore } from '@/stores/saveStore';
import type { AnalysisSections } from '@/lib/parseAnalysisStream';

// Mock dialog methods
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ user: { getIdToken: vi.fn().mockResolvedValue('mock-token') }, loading: false }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('mock-token') },
  })),
  linkWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

import { SaveButton } from '../SaveButton';

const mockSections: AnalysisSections = {
  issues: ['쟁점 1'],
  statutes: '민법 제840조',
  precedents: '판례 1',
  lawyerQuestions: ['질문 1'],
  rawText: 'raw',
};

describe('SaveButton', () => {
  beforeEach(() => {
    useSaveStore.setState({
      status: 'idle',
      sessionId: null,
      errorMessage: null,
    });
    vi.clearAllMocks();
  });

  it('renders "결과 저장하기" button in idle state', () => {
    render(<SaveButton sections={mockSections} />);
    expect(screen.getByText('결과 저장하기')).toBeDefined();
  });

  it('sets status to consent when button is clicked', () => {
    render(<SaveButton sections={mockSections} />);
    fireEvent.click(screen.getByText('결과 저장하기'));
    expect(useSaveStore.getState().status).toBe('consent');
  });

  it('shows SaveConsentDialog when status is consent', () => {
    useSaveStore.setState({ status: 'consent' });
    render(<SaveButton sections={mockSections} />);
    expect(screen.getByText('민감정보 서버 저장 동의')).toBeDefined();
  });

  it('renders "저장되었습니다" when status is saved', () => {
    useSaveStore.setState({ status: 'saved' });
    render(<SaveButton sections={mockSections} />);
    expect(screen.getByText(/저장되었습니다/)).toBeDefined();
    expect(screen.queryByText('결과 저장하기')).toBeNull();
  });

  it('renders error message when status is error', () => {
    useSaveStore.setState({ status: 'error', errorMessage: '팝업이 차단되었습니다.' });
    render(<SaveButton sections={mockSections} />);
    expect(screen.getByText(/팝업이 차단되었습니다/)).toBeDefined();
  });

  it('disables button when status is saving', () => {
    useSaveStore.setState({ status: 'saving' });
    render(<SaveButton sections={mockSections} />);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
