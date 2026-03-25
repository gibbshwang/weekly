export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-300 tracking-tight">K-FGI</span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs text-gray-500">한국 시장 심리 지수</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            K-FGI는 한국 시장 데이터 기반의 독립적 합성 심리지수입니다.
            KOSPI, VKOSPI, 신용스프레드 등 7개 로컬 시그널을 종합하여 산출합니다.
          </p>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            본 서비스는 투자 권유를 제공하지 않습니다. 모든 콘텐츠는 정보 제공 목적이며,
            투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
            과거의 패턴이 미래 수익을 보장하지 않습니다.
          </p>
          <p className="text-xs text-gray-700 mt-2">
            © 2026 K-FGI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
