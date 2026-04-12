'use client';

import { useState, useEffect } from 'react';

export function IncognitoGuidance() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('incognito_guidance_seen');
    if (!seen) {
      setShow(true);
      sessionStorage.setItem('incognito_guidance_seen', 'true');
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] max-w-md mx-auto bg-white border border-gray-300 rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            안전을 위해 시크릿(비공개) 모드 사용을 권장합니다
          </p>
          <p className="text-xs text-gray-600">
            시크릿 모드에서는 방문 기록이 브라우저에 저장되지 않습니다.
            Chrome: Ctrl+Shift+N / Safari: Cmd+Shift+N
          </p>
        </div>
        <button
          onClick={() => setShow(false)}
          aria-label="안내 닫기"
          className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
