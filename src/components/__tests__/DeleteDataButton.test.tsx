import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  }),
}));

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
vi.stubGlobal('fetch', mockFetch);

// Mock sessionStorage
const mockClear = vi.fn();
vi.stubGlobal('sessionStorage', { clear: mockClear });

import { DeleteDataButton } from '../DeleteDataButton';
import { useWizardStore } from '@/stores/wizardStore';

describe('DeleteDataButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('renders "내 데이터 전체 삭제" button', () => {
    render(<DeleteDataButton />);
    expect(screen.getByText('내 데이터 전체 삭제')).toBeDefined();
  });

  it('shows confirmation text on click', async () => {
    const user = userEvent.setup();
    render(<DeleteDataButton />);
    await user.click(screen.getByText('내 데이터 전체 삭제'));
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeDefined();
  });

  it('calls fetch DELETE + sessionStorage.clear + store.reset on confirm', async () => {
    const user = userEvent.setup();
    const resetSpy = vi.spyOn(useWizardStore.getState(), 'reset');

    render(<DeleteDataButton />);
    await user.click(screen.getByText('내 데이터 전체 삭제'));
    await user.click(screen.getByText('삭제'));

    // Wait for async operations
    await screen.findByText('데이터가 삭제되었습니다.');

    expect(mockFetch).toHaveBeenCalledWith('/api/account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer mock-token' },
    });
    expect(mockClear).toHaveBeenCalled();
  });

  it('returns to initial state on cancel', async () => {
    const user = userEvent.setup();
    render(<DeleteDataButton />);
    await user.click(screen.getByText('내 데이터 전체 삭제'));
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeDefined();
    await user.click(screen.getByText('취소'));
    expect(screen.getByText('내 데이터 전체 삭제')).toBeDefined();
  });
});
