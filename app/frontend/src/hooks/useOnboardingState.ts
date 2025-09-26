import { create } from 'zustand';

interface OnboardingState {
  step: number;
  completed: boolean;
  setStep(step: number): void;
  complete(): void;
}

export const useOnboardingState = create<OnboardingState>((set) => ({
  step: 1,
  completed: false,
  setStep(step) {
    set({ step });
  },
  complete() {
    set({ completed: true, step: 4 });
  }
}));
