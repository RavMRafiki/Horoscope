"use client";

import { LoadingOverlay } from "./LoadingOverlay";
import { OnboardingStepContent } from "./OnboardingStepContent";
import { StepActions } from "./StepActions";

export function OnboardingForm({
  transports,
  zodiacSign,
  birthYear,
  onboardingStep,
  loading,
  error,
  isFormSubmittable,
  onToggleTransport,
  onSelectZodiac,
  onChangeBirthYear,
  onPrevious,
  onNext,
  onSubmit,
}: {
  transports: string[];
  zodiacSign: string;
  birthYear: string;
  onboardingStep: number;
  loading: boolean;
  error: string;
  isFormSubmittable: boolean;
  onToggleTransport: (transport: string) => void;
  onSelectZodiac: (sign: string) => void;
  onChangeBirthYear: (value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const progressWidth = `${((onboardingStep + 1) / 3) * 100}%`;

  return (
    <main className="shell">
      {loading && <LoadingOverlay />}
      <section className="hero">
        <p className="eyebrow">✦ Horoskop Podróży ✦</p>
        <h1 className="arcana-page-title">AstroCommute</h1>
        <p className="intro">
          Wystarczą trzy proste kroki, by sprawdzić, jak dziś układają się
          gwiazdy dla Twojej trasy.
        </p>
        <section className="onboarding" aria-label="Konfiguracja horoskopu">
          <div className="progress">
            <span>KROK {onboardingStep + 1} Z 3</span>
            <i style={{ width: progressWidth }} />
          </div>

          <OnboardingStepContent
            step={onboardingStep}
            transports={transports}
            zodiacSign={zodiacSign}
            birthYear={birthYear}
            onToggleTransport={onToggleTransport}
            onSelectZodiac={onSelectZodiac}
            onChangeBirthYear={onChangeBirthYear}
          />

          <StepActions
            step={onboardingStep}
            loading={loading}
            isFormSubmittable={isFormSubmittable}
            onPrevious={onPrevious}
            onNext={onNext}
            onSubmit={onSubmit}
          />
        </section>
      </section>

      {error && <div className="error">{error}</div>}
    </main>
  );
}
