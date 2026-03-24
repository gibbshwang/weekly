import { mockScore } from "@/data/mockData";
import ComponentCard from "./ComponentCard";

export default function ComponentGrid() {
  const { components } = mockScore;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">7대 심리 지표</h2>
        <p className="text-xs text-gray-500 mt-1">
          Phase 1: 4개 지표 기반 산출 · Phase 1.5/2 지표는 순차 업데이트 예정
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
