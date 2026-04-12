'use client';

import { useEffect, useRef } from 'react';

interface SaveConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

export function SaveConsentDialog({ open, onConsent, onCancel }: SaveConsentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onCancel();
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="fixed inset-0 z-50 m-auto max-w-md w-[calc(100%-2rem)] rounded-lg p-6 bg-white shadow-xl backdrop:bg-black/50"
      aria-labelledby="save-consent-title"
      aria-describedby="save-consent-desc"
    >
      <h2 id="save-consent-title" className="text-lg font-bold text-gray-900 mb-3">
        민감정보 서버 저장 동의
      </h2>
      <p id="save-consent-desc" className="text-sm text-gray-700 mb-4 leading-relaxed">
        이혼 관련 상황 및 분석 결과가 Google 계정과 연결된 서버에 영구 저장됩니다.
        이 정보는 개인정보보호법 제23조의 민감정보에 해당합니다.
      </p>
      <ul className="text-sm text-gray-600 mb-6 leading-relaxed space-y-1">
        <li>저장 목적: 분석 결과 재열람</li>
        <li>보관 기간: 계정 삭제 시까지</li>
        <li>제3자 제공: 없음</li>
        <li>AI 학습 사용: 없음</li>
      </ul>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium min-h-[48px]"
        >
          취소
        </button>
        <button
          onClick={onConsent}
          className="flex-1 py-3 bg-[#1B6B5A] text-white rounded-lg font-medium min-h-[48px]"
        >
          동의하고 저장하기
        </button>
      </div>
    </dialog>
  );
}
