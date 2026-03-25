import { componentDescriptions } from "@/data/componentDescriptions";

const signals = Object.values(componentDescriptions);

export default function MethodologyDisclaimer() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-800">
        <h2 className="text-base font-bold text-white">산출 방법론</h2>
        <p className="text-xs text-gray-500 mt-0.5">K-FGI 7개 시그널 정의 및 합성 방법</p>
      </div>
      <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
        {/* 7 signal definitions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signals.map((s, i) => (
            <div key={i} className="flex items-start gap-2 bg-gray-800/40 rounded-lg p-3 border border-gray-800">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                <p className="text-xs text-gray-600 mt-0.5">산식: {s.formula}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Methodology notes */}
        <div className="flex flex-col gap-2 text-xs text-gray-500 leading-relaxed">
          <p><span className="text-gray-400 font-medium">정규화:</span> 각 시그널의 원시값을 과거 분포 기준 0–100 범위로 변환합니다. 0은 극단적 공포, 100은 극단적 탐욕입니다.</p>
          <p><span className="text-gray-400 font-medium">합성 점수:</span> 7개 시그널의 동일 가중 평균으로 K-FGI 종합 점수를 산출합니다.</p>
          <p><span className="text-gray-400 font-medium">레짐 구간:</span> 0–20 극단적 공포 · 21–40 공포 · 41–60 중립 · 61–80 탐욕 · 81–100 극단적 탐욕</p>
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-800">
          <p className="text-xs text-gray-600 leading-relaxed">
            본 분석은 교육 및 정보 제공 목적이며, 투자 권유가 아닙니다.
            과거의 패턴이 미래 수익을 보장하지 않습니다.
            표본이 작은 극단 구간에서는 통계적 신뢰도가 낮을 수 있습니다.
            투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
