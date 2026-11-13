"use client";

import { useState } from "react";
import type { HoroscopeResult } from "@/lib/domain/horoscope";
import { requestErrorMessage, requestHoroscope } from "@/lib/api/horoscope-client";
import {
  isOnboardingValid,
  isValidBirthYear,
  validateStep,
} from "@/lib/onboarding";

const LAST_STEP = 2;
const INCOMPLETE_FORM_ERROR = "Wybierz transport, znak zodiaku i rok urodzenia.";

export function useHoroscope() {
  const [transports, setTransports] = useState<string[]>([]);
  const [zodiacSign, setZodiacSign] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [result, setResult] = useState<HoroscopeResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onboardingComplete = isOnboardingValid(
    transports,
    zodiacSign,
    birthYear,
  );
  const isFormSubmittable = onboardingComplete && !loading;

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
    setOnboardingStep((step) => Math.min(step + 1, LAST_STEP));
  }

  function previousStep() {
    setError("");
    setOnboardingStep((step) => step - 1);
  }

  function reset() {
    setResult(null);
    setOnboardingStep(0);
  }

  async function submit() {
    if (!onboardingComplete) {
      if (birthYear && !isValidBirthYear(birthYear)) {
        setError(
          `Podaj poprawny rok urodzenia (1900–${new Date().getFullYear()}).`,
        );
      } else {
        setError(INCOMPLETE_FORM_ERROR);
      }
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

  return {
    transports,
    zodiacSign,
    birthYear,
    onboardingStep,
    result,
    error,
    loading,
    onboardingComplete,
    isFormSubmittable,
    setZodiacSign,
    setBirthYear,
    toggleTransport,
    nextStep,
    previousStep,
    submit,
    reset,
  };
}
