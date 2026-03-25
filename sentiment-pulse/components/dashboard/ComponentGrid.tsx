import { mockScore } from "@/data/mockData";
import ComponentCard from "./ComponentCard";

export default function ComponentGrid() {
  const { components } = mockScore;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-base font-bold text-white">오늘의 7대 시그널</h2>
        <span className="text-xs text-gray-500">K-FGI 종합 점수를 구성하는 7개 지표</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {components.map((c) => (
          <ComponentCard
            key={c.id}
            id={c.id}
            label={c.label}
            labelEn={c.labelEn}
            score={c.score}
            status={c.status}
            direction={c.direction}
            note={c.note}
          />
        ))}
      </div>
    </div>
  );
}
