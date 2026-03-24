import { mockScore } from "@/data/mockData";
import { assetImplications, assetLabels, AssetClass } from "@/data/assetImplications";

export default function AssetImplications() {
  const { regime } = mockScore;
  const implications = assetImplications[regime];
  const assets: AssetClass[] = ["us_equity", "bonds_usd", "kr_equity", "crypto"];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">자산별 함의</h2>
        <p className="text-xs text-red-500/80 mt-1 flex items-center gap-1">
          <span>⚠</span>
          이 내용은 투자 권유가 아닙니다. 역사적 패턴을 참고용으로 제공합니다.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {assets.map((asset) => {
          const { label, emoji } = assetLabels[asset];
          const { pattern, usageNote } = implications[asset];
          return (
            <div
              key={asset}
              className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{emoji}</span>
                <span className="text-sm font-bold text-white">{label}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed flex-1">{pattern}</p>
              <div className="border-t border-gray-800 pt-2">
                <p className="text-xs text-gray-500 leading-relaxed">{usageNote}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
