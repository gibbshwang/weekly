import { mockScore } from "@/data/mockData";
import ComponentCard from "./ComponentCard";

export default function ComponentGrid() {
  const { components } = mockScore;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">7대 심리 지표 분해</h2>
        <p className="text-xs text-gray-500 mt-1">
          종합 지수를 구성하는 세부 신호 — 어느 지표가 심리를 끌어내리고 있는지 확인하세요
        </p>
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
