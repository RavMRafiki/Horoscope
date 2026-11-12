"use client";

import { TransportStep } from "./TransportStep";
import { ZodiacStep } from "./ZodiacStep";
import { BirthYearStep } from "./BirthYearStep";

export function OnboardingStepContent({
  step,
  transports,
  zodiacSign,
  birthYear,
  onToggleTransport,
  onSelectZodiac,
  onChangeBirthYear,
}: {
  step: number;
  transports: string[];
  zodiacSign: string;
  birthYear: string;
  onToggleTransport: (transport: string) => void;
  onSelectZodiac: (sign: string) => void;
  onChangeBirthYear: (value: string) => void;
}) {
  if (step === 0) {
    return <TransportStep selected={transports} onToggle={onToggleTransport} />;
  }
  if (step === 1) {
    return <ZodiacStep selected={zodiacSign} onSelect={onSelectZodiac} />;
  }
  return <BirthYearStep value={birthYear} onChange={onChangeBirthYear} />;
}
