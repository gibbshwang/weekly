'use client';

interface WizardProgressProps {
  current: number;
  total: number;
}

export function WizardProgress({ current, total }: WizardProgressProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">{current} / {total} 단계</span>
      </div>
      <div className="w-full bg-[#E8E4E0] rounded-full h-1.5">
        <div
          data-testid="progress-bar"
          className="bg-[#1B6B5A] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
