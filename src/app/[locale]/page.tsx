import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          이혼 법률 상담,
          <br />
          어디서부터 시작해야 할지 모르겠다면
        </h1>
        <p className="text-base text-gray-600 mb-8 leading-relaxed">
          4가지 질문에 답하면 관련 법령, 판례,
          <br />
          변호사에게 물어볼 질문을 정리해 드립니다.
        </p>
        <Link
          href="/wizard"
          className="inline-block px-8 py-4 bg-[#1B6B5A] text-white rounded-lg font-bold text-lg min-h-[48px] hover:bg-[#155A4A] transition-colors"
        >
          무료로 시작하기
        </Link>
        <p className="mt-8 text-xs text-gray-500">
          법률 정보 제공 서비스이며, 법률 자문이 아닙니다.
        </p>
      </div>
    </div>
  );
}
