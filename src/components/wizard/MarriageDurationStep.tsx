'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizardStore } from '@/stores/wizardStore';

const schema = z.object({
  marriageDuration: z.string().min(1, '결혼 기간을 입력해주세요'),
});

type FormData = z.infer<typeof schema>;

interface MarriageDurationStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function MarriageDurationStep({ onNext, onBack }: MarriageDurationStepProps) {
  const { situation, updateSituation } = useWizardStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      marriageDuration: situation.marriageDuration || '',
    },
  });

  const onSubmit = (data: FormData) => {
    updateSituation({ marriageDuration: data.marriageDuration });
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">결혼 기간</h2>
      <p className="text-base text-gray-600 mb-6">결혼하신 지 얼마나 되셨나요?</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          {...register('marriageDuration')}
          type="text"
          placeholder="예: 5년, 10년 6개월"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#1B6B5A] focus:border-transparent"
        />
        {errors.marriageDuration && (
          <p className="mt-2 text-sm text-red-600">{errors.marriageDuration.message}</p>
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
            다음
          </button>
        </div>
      </form>
    </div>
  );
}
