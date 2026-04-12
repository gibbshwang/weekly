import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuickExitButton } from '../QuickExitButton';

describe('QuickExitButton', () => {
  const mockReplaceState = vi.fn();
  const mockLocationReplace = vi.fn();
  let sessionClearSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockReplaceState.mockReset();
    mockLocationReplace.mockReset();
    vi.spyOn(window.history, 'replaceState').mockImplementation(mockReplaceState);
    sessionClearSpy = vi.spyOn(Storage.prototype, 'clear');
    Object.defineProperty(window, 'location', {
      value: { replace: mockLocationReplace },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with accessible label', () => {
    render(<QuickExitButton />);
    expect(screen.getByLabelText('사이트 즉시 나가기')).toBeInTheDocument();
  });

  it('calls replaceState, clears storage, and redirects on click', () => {
    render(<QuickExitButton />);
    fireEvent.click(screen.getByLabelText('사이트 즉시 나가기'));
    expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/');
    expect(sessionClearSpy).toHaveBeenCalled();
    expect(mockLocationReplace).toHaveBeenCalledWith('https://weather.naver.com');
  });
});
