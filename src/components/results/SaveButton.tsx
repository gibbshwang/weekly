'use client';

import { useSaveStore } from '@/stores/saveStore';
import { useWizardStore } from '@/stores/wizardStore';
import { SaveConsentDialog } from './SaveConsentDialog';
import type { AnalysisSections } from '@/lib/parseAnalysisStream';

interface SaveButtonProps {
  sections: AnalysisSections;
}

export function SaveButton({ sections }: SaveButtonProps) {
  const { status, errorMessage, setStatus, setSessionId, setError } = useSaveStore();

  const handleSaveClick = () => {
    setStatus('consent');
  };

  const performSave = async () => {
    setStatus('saving');
    const sessionId = crypto.randomUUID();
    setSessionId(sessionId);
    try {
      const { getAuth } = await import('firebase/auth');
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          wizardSituation: useWizardStore.getState().situation,
          analysisResult: sections,
          pipaConsentedAt: Date.now(),
        }),
      });
      if (res.ok) {
        setStatus('saved');
      } else {
        setError('저장 중 오류가 발생했습니다.');
        setStatus('error');
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const handleConsent = async () => {
    setStatus('google-login');
    try {
      const { linkWithPopup, GoogleAuthProvider, getAuth } = await import('firebase/auth');
      await linkWithPopup(getAuth().currentUser!, new GoogleAuthProvider());
      await performSave();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        setError('팝업이 차단되었습니다. 브라우저 설정을 확인해 주세요.');
      } else if (code === 'auth/credential-already-in-use') {
        setError('이미 다른 계정과 연결된 Google 계정입니다.');
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
      setStatus('error');
    }
  };

  const handleCancel = () => {
    setStatus('idle');
    setError(null);
  };

  if (status === 'saved') {
    return (
      <p className="text-sm text-[#1B6B5A] font-medium text-center py-3">
        저장되었습니다.
      </p>
    );
  }

  return (
    <div>
      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-600 text-center mb-2">{errorMessage}</p>
      )}
      <button
        onClick={handleSaveClick}
        disabled={status === 'saving' || status === 'google-login'}
        className="w-full py-3 border-2 border-[#1B6B5A] text-[#1B6B5A] rounded-lg font-medium min-h-[48px] hover:bg-[#F0FAF7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'saving' ? '저장 중...' : '결과 저장하기'}
      </button>
      <SaveConsentDialog
        open={status === 'consent'}
        onConsent={handleConsent}
        onCancel={handleCancel}
      />
    </div>
  );
}
