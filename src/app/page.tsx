"use client";

import { useHoroscope } from "@/hooks/useHoroscope";
import { ResultView } from "@/components/results/ResultView";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default function Home() {
  const h = useHoroscope();

  if (h.result) {
    return <ResultView result={h.result} onReset={h.reset} />;
  }

  return (
    <OnboardingForm
      transports={h.transports}
      zodiacSign={h.zodiacSign}
      birthYear={h.birthYear}
      onboardingStep={h.onboardingStep}
      loading={h.loading}
      error={h.error}
      isFormSubmittable={h.isFormSubmittable}
      onToggleTransport={h.toggleTransport}
      onSelectZodiac={h.setZodiacSign}
      onChangeBirthYear={h.setBirthYear}
      onPrevious={h.previousStep}
      onNext={h.nextStep}
      onSubmit={h.submit}
    />
  );
}
