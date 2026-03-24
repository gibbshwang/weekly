import Link from "next/link";

const personas = [
  {
    name: "보수적 투자자",
    icon: "🛡",
    description: "원금 보호 최우선. 공포 구간에서도 안전자산 비중을 유지하는 전략 프레임",
    points: ["채권/달러 비중 확대 기준", "손절 레벨 설정 참고", "방어주 중심 접근"],
  },
  {
    name: "균형 투자자",
    icon: "⚖",
    description: "수익과 리스크의 균형. 심리 구간별 자산 배분 조정 프레임",
    points: ["심리 구간별 주식/채권 비율", "리밸런싱 타이밍 참고", "섹터 로테이션 기준"],
  },
  {
    name: "공격적 투자자",
    icon: "🚀",
    description: "고위험 고수익 추구. 극단 구간을 기회로 활용하는 전략 프레임",
    points: ["레버리지 ETF 접근 기준", "극단 공포 분할매수 전략", "모멘텀 포착 신호"],
  },
];

export default function ProPreview() {
  return (
    <div className="relative rounded-xl border border-amber-800/30 overflow-hidden">
      {/* Blurred content */}
      <div className="filter blur-sm pointer-events-none select-none">
        <div className="bg-gray-900 p-4 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">투자 성향별 프레임</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {personas.map((persona) => (
              <div
                key={persona.name}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{persona.icon}</span>
                  <span className="text-sm font-bold text-white">{persona.name}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">{persona.description}</p>
                <div className="flex flex-col gap-1">
                  {persona.points.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-amber-500 text-xs">•</span>
                      <span className="text-xs text-gray-400">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center gap-4 p-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔒</span>
          <span className="text-lg font-bold text-amber-400">PRO 전용</span>
        </div>
        <p className="text-sm text-gray-300 text-center max-w-xs">
          투자 성향별 맞춤 프레임을 확인하고 나의 전략에 적용하세요
        </p>
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/subscribe"
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-sm"
          >
            PRO 시작하기 →
          </Link>
          <span className="text-xs text-gray-500">₩4,900/월 · 언제든 취소 가능</span>
        </div>
      </div>
    </div>
  );
}
