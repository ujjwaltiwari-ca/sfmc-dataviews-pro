/** CustomEvent names for global site chrome (header listeners, footer dispatchers). */

export const OPEN_DOCUMENTATION_EVENT = 'dataviews:open-docs';
export const OPEN_PLATFORM_INFO_EVENT = 'dataviews:open-platform-info';
export const OPEN_ONBOARDING_TOUR_EVENT = 'dataviews:open-onboarding-tour';

export function dispatchOpenOnboardingTour(): void {
  window.dispatchEvent(new CustomEvent(OPEN_ONBOARDING_TOUR_EVENT));
}
