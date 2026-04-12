'use client';

interface IssueChecklistProps {
  issues: string[];
}

export function IssueChecklist({ issues }: IssueChecklistProps) {
  if (issues.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">쟁점 체크리스트</h3>
      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-700">
            <span className="text-[#1B6B5A] font-bold mt-0.5">✓</span>
            <span>{issue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
