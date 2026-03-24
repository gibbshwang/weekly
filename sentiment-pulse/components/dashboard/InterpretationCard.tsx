import { mockScore } from "@/data/mockData";
import { interpretations } from "@/data/interpretations";

export default function InterpretationCard() {
  const { regime } = mockScore;
  const info = interpretations[regime];

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-800">
      <div className="flex items-start gap-3">
        <div
          className="w-1 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: info.color, height: "100%", minHeight: "60px" }}
        />
        <div className="flex flex-col gap-3 flex-1">
          <div>
            <h2 className="text-base font-semibold text-white mb-1">현재 시장 해석</h2>
            <p className="text-sm text-gray-300 leading-relaxed">{info.interpretation}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">주요 원인</p>
            <p className="text-sm text-gray-400 leading-relaxed">{info.drivingFactors}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
