'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWizardStore } from '@/stores/wizardStore';

const schema = z.object({
  hasChildren: z.boolean(),
  childrenInfo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ChildrenStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ChildrenStep({ onNext, onBack }: ChildrenStepProps) {
  const { situation, updateSituation } = useWizardStore();

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      hasChildren: situation.hasChildren ?? false,
      childrenInfo: situation.childrenInfo || '',
    },
  });

  const hasChildren = watch('hasChildren');

  const onSubmit = (data: FormData) => {
    updateSituation({
      hasChildren: data.hasChildren,
      childrenInfo: data.hasChildren ? data.childrenInfo : undefined,
    });
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">자녀</h2>
      <p className="text-base text-gray-600 mb-6">자녀가 있으신가요?</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setValue('hasChildren', true)}
            className={`flex-1 py-3 rounded-lg font-medium min-h-[48px] border ${
              hasChildren ? 'bg-[#1B6B5A] text-white border-[#1B6B5A]' : 'border-gray-300 text-gray-700'
            }`}
          >
            네
          </button>
          <button
            type="button"
            onClick={() => setValue('hasChildren', false)}
            className={`flex-1 py-3 rounded-lg font-medium min-h-[48px] border ${
              !hasChildren ? 'bg-[#1B6B5A] text-white border-[#1B6B5A]' : 'border-gray-300 text-gray-700'
            }`}
          >
            아니오
          </button>
        </div>

        {hasChildren && (
          <div className="mb-6">
            <label htmlFor="childrenInfo" className="block text-sm text-gray-600 mb-2">
              자녀 나이와 현재 양육 상황을 알려주세요
            </label>
            <textarea
              id="childrenInfo"
              {...register('childrenInfo')}
              placeholder="예: 초등학생 2명, 현재 제가 양육 중"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-[#1B6B5A]"
            />
          </div>
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
