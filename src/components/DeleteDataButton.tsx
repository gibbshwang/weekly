'use client';

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useWizardStore } from '@/stores/wizardStore';

export function DeleteDataButton() {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'deleting' | 'done' | 'error'>('idle');

  const handleClick = () => setStatus('confirming');
  const handleCancel = () => setStatus('idle');

  const handleConfirm = async () => {
    setStatus('deleting');
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) {
        setStatus('error');
        return;
      }
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('삭제 실패');
      sessionStorage.clear();
      useWizardStore.getState().reset();
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return <p className="text-xs text-gray-600 text-center py-2">데이터가 삭제되었습니다.</p>;
  }

  return (
    <div className="text-center py-2">
      {status === 'confirming' ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-700">정말 삭제하시겠습니까?</span>
          <button onClick={handleConfirm} disabled={status === 'deleting'}
            className="text-xs text-red-600 underline min-h-[48px] px-2">
            삭제
          </button>
          <button onClick={handleCancel}
            className="text-xs text-gray-600 underline min-h-[48px] px-2">
            취소
          </button>
        </div>
      ) : (
        <button onClick={handleClick}
          className="text-xs text-gray-600 underline min-h-[48px] px-2">
          내 데이터 전체 삭제
        </button>
      )}
      {status === 'error' && <p className="text-xs text-red-600 mt-1">삭제 중 오류가 발생했습니다.</p>}
    </div>
  );
}
