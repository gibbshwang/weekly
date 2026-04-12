import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from '../wizardStore';

describe('wizardStore', () => {
  beforeEach(() => {
    useWizardStore.setState(useWizardStore.getInitialState());
  });

  it('has initial state: currentStep=0, situation={}, isDvDetected=false', () => {
    const state = useWizardStore.getState();
    expect(state.currentStep).toBe(0);
    expect(state.situation).toEqual({});
    expect(state.isDvDetected).toBe(false);
  });

  it('setStep(2) sets currentStep to 2', () => {
    useWizardStore.getState().setStep(2);
    expect(useWizardStore.getState().currentStep).toBe(2);
  });

  it('updateSituation merges marriageDuration', () => {
    useWizardStore.getState().updateSituation({ marriageDuration: '5년' });
    expect(useWizardStore.getState().situation.marriageDuration).toBe('5년');
  });

  it('updateSituation preserves existing values when adding new ones (INTAKE-03)', () => {
    useWizardStore.getState().updateSituation({ marriageDuration: '5년' });
    useWizardStore.getState().updateSituation({ hasChildren: true });
    const { situation } = useWizardStore.getState();
    expect(situation.marriageDuration).toBe('5년');
    expect(situation.hasChildren).toBe(true);
  });

  it('setDvDetected(true) sets isDvDetected to true', () => {
    useWizardStore.getState().setDvDetected(true);
    expect(useWizardStore.getState().isDvDetected).toBe(true);
  });

  it('reset() restores all state to initial values', () => {
    useWizardStore.getState().setStep(3);
    useWizardStore.getState().updateSituation({ marriageDuration: '10년' });
    useWizardStore.getState().setDvDetected(true);
    useWizardStore.getState().reset();
    const state = useWizardStore.getState();
    expect(state.currentStep).toBe(0);
    expect(state.situation).toEqual({});
    expect(state.isDvDetected).toBe(false);
  });

  it('situation values persist across step changes (INTAKE-03)', () => {
    useWizardStore.getState().updateSituation({ marriageDuration: '5년' });
    useWizardStore.getState().setStep(1);
    useWizardStore.getState().updateSituation({ hasChildren: false });
    useWizardStore.getState().setStep(2);
    const { situation } = useWizardStore.getState();
    expect(situation.marriageDuration).toBe('5년');
    expect(situation.hasChildren).toBe(false);
  });
});
