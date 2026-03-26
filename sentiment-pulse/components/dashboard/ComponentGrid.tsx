import ComponentCard from "./ComponentCard";
import type { SignalReading } from "@/lib/types/kfgi";

interface ComponentGridProps {
  signals: SignalReading[];
}

export default function ComponentGrid({ signals }: ComponentGridProps) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-base font-bold text-white">오늘의 7대 시그널</h2>
        <span className="text-xs text-gray-500">K-FGI 종합 점수를 구성하는 7개 지표</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {signals.map((s) => {
          const { key: signalKey, ...rest } = s;
          return <ComponentCard key={signalKey} {...rest} />;
        })}
      </div>
    </div>
  );
}
