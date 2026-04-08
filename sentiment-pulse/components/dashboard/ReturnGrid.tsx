import type { CaseReturn } from '@/lib/types/narrative';

interface ReturnGridProps {
  returns: CaseReturn[];
}

function formatReturn(val: number | null): string {
  if (val === null) return "—";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function returnColor(val: number | null): string {
  if (val === null) return 'var(--text-3)';
  if (val > 0) return 'var(--greed)';
  if (val < 0) return 'var(--fear)';
  return 'var(--text-2)';
}

export default function ReturnGrid({ returns }: ReturnGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-1.5 pr-3 font-medium" style={{ color: 'var(--text-3)' }}>자산</th>
            <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-3)' }}>30일</th>
            <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-3)' }}>60일</th>
            <th className="text-right py-1.5 pl-2 font-medium" style={{ color: 'var(--text-3)' }}>90일</th>
          </tr>
        </thead>
        <tbody>
          {returns.map((r) => (
            <tr key={r.asset} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td className="py-1.5 pr-3 font-medium font-body" style={{ color: 'var(--text-2)' }}>{r.asset}</td>
              <td className="text-right py-1.5 px-2 font-data font-semibold" style={{ color: returnColor(r.return30d) }}>
                {formatReturn(r.return30d)}
              </td>
              <td className="text-right py-1.5 px-2 font-data font-semibold" style={{ color: returnColor(r.return60d) }}>
                {formatReturn(r.return60d)}
              </td>
              <td className="text-right py-1.5 pl-2 font-data font-semibold" style={{ color: returnColor(r.return90d) }}>
                {formatReturn(r.return90d)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
