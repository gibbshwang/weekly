import { create } from 'zustand';
import type { UserSituation } from '@/types/analysis';

interface WizardState {
  currentStep: number;
  situation: Partial<UserSituation>;
  isDvDetected: boolean;
  pipaConsented: boolean;
  setStep: (step: number) => void;
  updateSituation: (partial: Partial<UserSituation>) => void;
  setDvDetected: (detected: boolean) => void;
  setPipaConsented: (consented: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  situation: {} as Partial<UserSituation>,
  isDvDetected: false,
  pipaConsented: false,
};

export const useWizardStore = create<WizardState>()((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  updateSituation: (partial) =>
    set((state) => ({ situation: { ...state.situation, ...partial } })),
  setDvDetected: (detected) => set({ isDvDetected: detected }),
  setPipaConsented: (consented) => set({ pipaConsented: consented }),
  reset: () => set({ ...initialState, situation: {} }),
}));
