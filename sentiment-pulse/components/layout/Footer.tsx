export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-300 tracking-tight">MOODEX</span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs text-gray-500">자체 근사 지수</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            MOODEX는 자체 근사 지수입니다. CNN Fear &amp; Greed Index를 복제하거나 공식 데이터를 사용하지 않습니다.
            CNN의 상표 또는 데이터와 무관하며, 독립적으로 개발된 심리 측정 모델입니다.
          </p>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            본 서비스는 투자 권유를 제공하지 않습니다. 모든 콘텐츠는 정보 제공 목적이며,
            투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
            과거의 패턴이 미래 수익을 보장하지 않습니다.
          </p>
          <p className="text-xs text-gray-700 mt-2">
            © 2026 MOODEX. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
