export function LawyerCTA() {
  return (
    <div className="bg-deep-teal/5 border border-deep-teal/20 rounded-lg p-4 mt-6">
      <p className="text-deep-teal font-semibold mb-2">
        변호사 상담을 권유합니다
      </p>
      <p className="text-sm text-gray-700 mb-3">
        위 정보는 일반적인 법률 정보이며, 구체적인 상황에 대한 판단은 전문 변호사의 상담이 필요합니다.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://www.klac.or.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center min-h-[48px] px-4 py-2 bg-deep-teal text-white rounded-lg text-sm font-medium hover:bg-deep-teal-dark transition-colors"
        >
          대한법률구조공단
        </a>
        <a
          href="tel:132"
          className="inline-flex items-center min-h-[48px] px-4 py-2 border border-deep-teal text-deep-teal rounded-lg text-sm font-medium hover:bg-deep-teal/5 transition-colors"
        >
          법률구조 상담전화 132
        </a>
      </div>
    </div>
  );
}
