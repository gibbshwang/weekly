'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizardStore } from '@/stores/wizardStore';
import { detectDv } from '@/lib/dvDetector';

const schema = z.object({
  divorceReason: z.string().min(1, '이혼 사유를 입력해주세요'),
});

type FormData = z.infer<typeof schema>;

interface DivorceReasonStepProps {
  onNext: () => void;
  onBack: () => void;
}

const QUICK_OPTIONS = ['성격 차이', '경제적 문제', '외도/부정행위', '가정폭력', '기타'];

export function DivorceReasonStep({ onNext, onBack }: DivorceReasonStepProps) {
  const { situation, updateSituation, setDvDetected } = useWizardStore();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      divorceReason: situation.divorceReason || '',
    },
  });

  const currentValue = watch('divorceReason');

  const onSubmit = (data: FormData) => {
    const isDv = detectDv(data.divorceReason);
    setDvDetected(isDv);
    updateSituation({ divorceReason: data.divorceReason });
    onNext();
  };

  const handleQuickOption = (option: string) => {
    const newValue = currentValue ? `${currentValue}, ${option}` : option;
    setValue('divorceReason', newValue, { shouldValidate: true });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">이혼 사유</h2>
      <p className="text-base text-gray-600 mb-4">어떤 이유로 이혼을 고려하고 계신가요?</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => handleQuickOption(option)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-full text-gray-700 hover:border-[#1B6B5A] hover:text-[#1B6B5A] min-h-[36px]"
          >
            {option}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <textarea
          {...register('divorceReason')}
          placeholder="자유롭게 작성해주세요"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-[#1B6B5A]"
        />
        {errors.divorceReason && (
          <p className="mt-2 text-sm text-red-600">{errors.divorceReason.message}</p>
        )}

        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium min-h-[48px]"
          >
            이전
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-[#1B6B5A] text-white rounded-lg font-medium min-h-[48px]"
          >
            분석 시작
          </button>
        </div>
      </form>
    </div>
  );
}
