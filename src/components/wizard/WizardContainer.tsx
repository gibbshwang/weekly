'use client';

import { useRef, useEffect, useState } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import type { UserSituation } from '@/types/analysis';
import { IntroStep } from './IntroStep';
import { MarriageDurationStep } from './MarriageDurationStep';
import { ChildrenStep } from './ChildrenStep';
import { AssetStep } from './AssetStep';
import { DivorceReasonStep } from './DivorceReasonStep';
import { SafetyBranch } from './SafetyBranch';
import { WizardProgress } from './WizardProgress';
import { PipaConsentDialog } from './PipaConsentDialog';

interface WizardContainerProps {
  onComplete: (situation: UserSituation) => void;
}

const TOTAL_STEPS = 5;

export function WizardContainer({ onComplete }: WizardContainerProps) {
  const { currentStep, isDvDetected, situation, setStep, pipaConsented, setPipaConsented } = useWizardStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPipaConsent, setShowPipaConsent] = useState(false);

  useEffect(() => {
    if (currentStep > 0) {
      const heading = containerRef.current?.querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === 3 && !pipaConsented) {
      setShowPipaConsent(true);
      return;
    }
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

  const handlePipaConsent = () => {
    setPipaConsented(true);
    setShowPipaConsent(false);
    setStep(4);
  };

  const handlePipaCancel = () => {
    setShowPipaConsent(false);
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
    <div ref={containerRef}>
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

      <PipaConsentDialog
        open={showPipaConsent}
        onConsent={handlePipaConsent}
        onCancel={handlePipaCancel}
      />
    </div>
  );
}
