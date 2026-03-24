import { mockScore } from "@/data/mockData";
import ComponentCard from "./ComponentCard";

export default function ComponentGrid() {
  const { components } = mockScore;
  const active = components.filter((c) => c.status === "active");
  const pending = components.filter((c) => c.status !== "active");

  return (
    <div className="flex flex-col gap-4">
      {/* Leading indicators — active, prominent */}
      <div>
        <div className="flex items-baseline gap-3 mb-3">
          <h2 className="text-base font-bold text-white">심리 주도 지표</h2>
          <span className="text-xs text-gray-500">현재 종합 점수를 구성하는 활성 지표</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {active.map((c) => (
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

      {/* Pending indicators — visible but quieter */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2">추가 예정 지표</p>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
            {pending.map((c) => (
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
      )}
    </div>
  );
}
