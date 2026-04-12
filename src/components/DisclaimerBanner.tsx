export function DisclaimerBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-900"
    >
      <p className="max-w-4xl mx-auto text-center">
        이 서비스는 법률 정보 제공 목적이며, <strong>법률 자문이 아닙니다</strong>.
        구체적인 법률 문제는 반드시 변호사와 상담하세요.
      </p>
    </div>
  );
}
