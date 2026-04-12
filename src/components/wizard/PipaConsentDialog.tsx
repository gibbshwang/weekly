'use client';

import { useEffect, useRef } from 'react';

interface PipaConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

export function PipaConsentDialog({ open, onConsent, onCancel }: PipaConsentDialogProps) {
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
      aria-labelledby="pipa-consent-title"
      aria-describedby="pipa-consent-desc"
    >
      <h2 id="pipa-consent-title" className="text-lg font-bold text-gray-900 mb-3">
        민감정보 처리 동의
      </h2>
      <p id="pipa-consent-desc" className="text-sm text-gray-700 mb-4 leading-relaxed">
        이후 입력하시는 &apos;이혼 사유&apos; 및 &apos;가정폭력 여부&apos; 정보는
        개인정보보호법 제23조의 민감정보에 해당할 수 있습니다.
      </p>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        이 정보는 법률 정보 검색 및 분석에만 사용되며,
        서버에 저장되지 않고 브라우저 세션 종료 시 삭제됩니다.
        AI 모델 학습에 사용되지 않습니다.
      </p>
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
          동의하고 계속하기
        </button>
      </div>
    </dialog>
  );
}
