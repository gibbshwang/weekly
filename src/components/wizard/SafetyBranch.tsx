'use client';

interface SafetyBranchProps {
  onContinue: () => void;
}

export function SafetyBranch({ onContinue }: SafetyBranchProps) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-[#FFF3F0] border border-red-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-red-800 mb-3">
          먼저 안전을 확인해 주세요
        </h2>
        <p className="text-base text-red-700 mb-6">
          입력하신 내용에 폭력 관련 상황이 포함된 것 같습니다.
          안전이 가장 중요합니다.
        </p>

        <div className="space-y-3 mb-6">
          <a
            href="tel:1366"
            className="flex items-center justify-center w-full py-3 bg-red-600 text-white rounded-lg font-bold min-h-[48px] hover:bg-red-700"
          >
            여성긴급전화 1366
          </a>
          <a
            href="tel:112"
            className="flex items-center justify-center w-full py-3 bg-red-700 text-white rounded-lg font-bold min-h-[48px] hover:bg-red-800"
          >
            경찰 112
          </a>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 border border-[#1B6B5A] text-[#1B6B5A] rounded-lg font-medium min-h-[48px] hover:bg-[#F0FAF7]"
        >
          안전한 상황입니다. 법률 정보 계속 보기
        </button>
      </div>
    </div>
  );
}
