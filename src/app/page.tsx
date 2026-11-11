"use client";

import { useState } from "react";
import type { WeatherResult } from "@/types/horoscope";
import {
  isOnboardingValid,
  requestErrorMessage,
  requestHoroscope,
  validateStep,
} from "@/lib/utils";
import { ResultView } from "@/components/ResultView";
import { TransportStep } from "@/components/TransportStep";
import { ZodiacStep } from "@/components/ZodiacStep";
import { BirthYearStep } from "@/components/BirthYearStep";

export default function Home() {
  const [transports, setTransports] = useState<string[]>([]);
  const [zodiacSign, setZodiacSign] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onboardingComplete = isOnboardingValid(
    transports,
    zodiacSign,
    birthYear,
  );

  function toggleTransport(transport: string) {
    setTransports((current) =>
      current.includes(transport)
        ? current.filter((item) => item !== transport)
        : [...current, transport],
    );
  }

  function nextStep() {
    setError("");
    const stepError = validateStep(onboardingStep, transports, zodiacSign);
    if (stepError) {
      setError(stepError);
      return;
    }
    setOnboardingStep((step) => Math.min(step + 1, 2));
  }

  function previousStep() {
    setError("");
    setOnboardingStep((step) => step - 1);
  }

  async function submit() {
    if (!onboardingComplete) {
      setError("Wybierz transport, znak zodiaku i rok urodzenia.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await requestHoroscope({ transports, zodiacSign, birthYear }));
    } catch (requestError) {
      setError(requestErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <ResultView
        result={result}
        onReset={() => {
          setResult(null);
          setOnboardingStep(0);
        }}
      />
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">✦ Energia Podróży ✦</p>
        <h1 className="arcana-page-title">URBAN ARCANA</h1>
        <p className="intro">
          Przejdziemy przez trzy krótkie kroki, aby stworzyć rozrywkowy ranking
          energii podróży.
        </p>
        <section className="onboarding" aria-label="Konfiguracja horoskopu">
          <div className="progress">
            <span>KROK {onboardingStep + 1} Z 3</span>
            <i style={{ width: `${((onboardingStep + 1) / 3) * 100}%` }} />
          </div>

          {onboardingStep === 0 && (
            <TransportStep selected={transports} onToggle={toggleTransport} />
          )}
          {onboardingStep === 1 && (
            <ZodiacStep selected={zodiacSign} onSelect={setZodiacSign} />
          )}
          {onboardingStep === 2 && (
            <BirthYearStep value={birthYear} onChange={setBirthYear} />
          )}

          <div className="step-actions">
            {onboardingStep > 0 && (
              <button className="secondary" onClick={previousStep}>
                Wstecz
              </button>
            )}
            {onboardingStep < 2 ? (
              <button className="primary" onClick={nextStep}>
                Dalej
              </button>
            ) : (
              <button
                className="primary"
                onClick={submit}
                disabled={loading || !onboardingComplete}
              >
                {loading ? "Tworzę ranking…" : "Odkryj swoją energię"}
              </button>
            )}
          </div>
        </section>
      </section>

      {error && <div className="error">{error}</div>}
    </main>
  );
}
