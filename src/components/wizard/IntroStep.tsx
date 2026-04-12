'use client';

interface IntroStepProps {
  onNext: () => void;
}

export function IntroStep({ onNext }: IntroStepProps) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 bg-[#F5F3F0]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        이혼 법률 정보 가이드
      </h1>

      <p className="text-base text-gray-700 mb-6 leading-relaxed">
        이혼을 고려하고 계신 상황이 쉽지 않으시죠.
        이 도구는 변호사 상담을 준비하는 데 도움을 드립니다.
      </p>

      <div className="bg-white rounded-xl p-5 mb-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">4가지 질문에 답하시면</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-[#1B6B5A] font-bold">✓</span>
            쟁점 체크리스트
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#1B6B5A] font-bold">✓</span>
            관련 법령 및 판례 요약
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#1B6B5A] font-bold">✓</span>
            변호사에게 물어볼 질문 목록
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-900">
        이 서비스는 법률 정보 제공 도구이며, <strong>법률 자문이 아닙니다</strong>.
        최종 판단은 반드시 변호사와 상담하세요.
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-[#1B6B5A] text-white rounded-lg font-bold text-lg min-h-[48px] hover:bg-[#155A4A] transition-colors"
      >
        시작하기
      </button>
    </div>
  );
}
