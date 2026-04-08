export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }} className="mt-16">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-black tracking-tight" style={{ color: 'var(--text-2)' }}>Korea F&G</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>|</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Korea Fear & Greed Index</span>
          </div>
          <p className="text-xs leading-relaxed max-w-3xl" style={{ color: 'var(--text-3)' }}>
            Korea Fear & Greed Index는 한국 시장 데이터 기반의 독립적 합성 심리지수입니다.
            KOSPI, VKOSPI, 신용스프레드 등 7개 로컬 시그널을 종합하여 산출합니다.
          </p>
          <p className="text-xs leading-relaxed max-w-3xl" style={{ color: 'var(--text-3)' }}>
            본 서비스는 투자 권유를 제공하지 않습니다. 모든 콘텐츠는 정보 제공 목적이며,
            투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
            과거의 패턴이 미래 수익을 보장하지 않습니다.
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
            © 2026 Korea Fear & Greed Index. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
