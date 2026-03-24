import { mockScore } from "@/data/mockData";
import { interpretations } from "@/data/interpretations";

export default function UsageGuide() {
  const { regime } = mockScore;
  const info = interpretations[regime];

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800 flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-white">활용 프레임</h2>
        <p className="text-xs text-gray-500 mt-1">
          현재 레짐({info.label}) 기준 일반적으로 관찰되는 접근 방식
        </p>
      </div>

      {/* Usage points */}
      <div className="flex flex-col gap-3">
        {info.usagePoints.map((point, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
              style={{ backgroundColor: info.color }}
            >
              {i + 1}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{point}</p>
          </div>
        ))}
      </div>

      {/* Watch for */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          주목할 신호 (Watch For)
        </h3>
        <div className="flex flex-col gap-2">
          {info.watchFor.map((signal, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-yellow-500 text-xs">→</span>
              <span className="text-sm text-gray-400">{signal}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-800">
        <span className="text-gray-500 text-sm flex-shrink-0">ℹ</span>
        <p className="text-xs text-gray-600 leading-relaxed">
          위 내용은 역사적 패턴 분석에 기반한 일반적 관찰이며, 개인 투자 권유가 아닙니다.
          투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
        </p>
      </div>
    </div>
  );
}
