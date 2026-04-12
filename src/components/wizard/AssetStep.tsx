'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizardStore } from '@/stores/wizardStore';

const schema = z.object({
  assetOverview: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AssetStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function AssetStep({ onNext, onBack }: AssetStepProps) {
  const { situation, updateSituation } = useWizardStore();

  const { register, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetOverview: situation.assetOverview || '',
    },
  });

  const onSubmit = (data: FormData) => {
    updateSituation({ assetOverview: data.assetOverview });
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">재산</h2>
      <p className="text-base text-gray-600 mb-6">
        부부 공동 재산이 있으신가요? (부동산, 예금, 차량 등)
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <textarea
          {...register('assetOverview')}
          placeholder="예: 아파트 1채(공동명의), 예금 5천만원 정도"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-[#1B6B5A]"
        />

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
