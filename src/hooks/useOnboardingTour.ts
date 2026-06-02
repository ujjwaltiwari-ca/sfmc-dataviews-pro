import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ONBOARDING_TOUR_STORAGE_KEY,
  TOUR_STEP_ONE_TABLES,
  type OnboardingTourStep,
} from '../constants/onboardingTour';

function readTourCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_TOUR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeTourCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_TOUR_STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export type OnboardingTourApi = {
  step: OnboardingTourStep;
  isActive: boolean;
  startTour: () => void;
  completeTour: () => void;
  goToStep: (step: OnboardingTourStep) => void;
  advanceStep: () => void;
};

export function useOnboardingTour(): OnboardingTourApi {
  const [step, setStep] = useState<OnboardingTourStep>(0);
  const autoStartedRef = useRef(false);

  const isActive = step > 0;

  const startTour = useCallback(() => {
    setStep(1);
  }, []);

  const completeTour = useCallback(() => {
    writeTourCompleted();
    setStep(0);
  }, []);

  const goToStep = useCallback((next: OnboardingTourStep) => {
    setStep(next);
  }, []);

  const advanceStep = useCallback(() => {
    setStep((current) => {
      if (current >= 3) {
        return 0;
      }
      return (current + 1) as OnboardingTourStep;
    });
  }, []);

  useEffect(() => {
    if (autoStartedRef.current || readTourCompleted()) {
      return;
    }
    autoStartedRef.current = true;
    const timer = window.setTimeout(() => setStep(1), 800);
    return () => window.clearTimeout(timer);
  }, []);

  return {
    step,
    isActive,
    startTour,
    completeTour,
    goToStep,
    advanceStep,
  };
}

export function isTourStepOneComplete(selectedTableNames: readonly string[]): boolean {
  return TOUR_STEP_ONE_TABLES.every((name) => selectedTableNames.includes(name));
}
