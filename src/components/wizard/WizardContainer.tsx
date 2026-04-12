'use client';

import { useWizardStore } from '@/stores/wizardStore';
import type { UserSituation } from '@/types/analysis';
import { IntroStep } from './IntroStep';
import { MarriageDurationStep } from './MarriageDurationStep';
import { ChildrenStep } from './ChildrenStep';
import { AssetStep } from './AssetStep';
import { DivorceReasonStep } from './DivorceReasonStep';
import { SafetyBranch } from './SafetyBranch';
import { WizardProgress } from './WizardProgress';

interface WizardContainerProps {
  onComplete: (situation: UserSituation) => void;
}

const TOTAL_STEPS = 5;

export function WizardContainer({ onComplete }: WizardContainerProps) {
  const { currentStep, isDvDetected, situation, setStep } = useWizardStore();

  const handleNext = () => {
    if (currentStep === 4) {
      if (isDvDetected) {
        setStep(5); // SafetyBranch
      } else {
        onComplete(situation as UserSituation);
      }
      return;
    }
    setStep(currentStep + 1);
  };

  const handleBack = () => {
    setStep(currentStep - 1);
  };

  const handleSafetyContinue = () => {
    onComplete(situation as UserSituation);
  };

  if (currentStep === 5) {
    return <SafetyBranch onContinue={handleSafetyContinue} />;
  }

  return (
    <div>
      {currentStep > 0 && (
        <WizardProgress current={currentStep} total={TOTAL_STEPS - 1} />
      )}

      {currentStep === 0 && <IntroStep onNext={handleNext} />}
      {currentStep === 1 && (
        <MarriageDurationStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 2 && (
        <ChildrenStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 3 && (
        <AssetStep onNext={handleNext} onBack={handleBack} />
      )}
      {currentStep === 4 && (
        <DivorceReasonStep onNext={handleNext} onBack={handleBack} />
      )}
    </div>
  );
}
