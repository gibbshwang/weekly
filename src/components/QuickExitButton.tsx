'use client';

import { useWizardStore } from '@/stores/wizardStore';

export function QuickExitButton() {
  const handleExit = () => {
    useWizardStore.getState().reset();
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
    window.location.replace('https://weather.naver.com');
  };

  return (
    <button
      onClick={handleExit}
      aria-label="사이트 즉시 나가기"
      className="fixed top-4 right-4 z-[9999] min-h-[56px] min-w-[56px] bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg px-4 py-2 shadow-lg transition-colors"
      style={{ paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
    >
      나가기 ✕
    </button>
  );
}
