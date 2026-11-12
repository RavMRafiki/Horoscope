export function isOnboardingValid(
  transports: string[],
  zodiacSign: string,
  birthYear: string,
): boolean {
  return transports.length > 0 && Boolean(zodiacSign) && Boolean(birthYear);
}

export function validateStep(
  step: number,
  transports: string[],
  zodiacSign: string,
): string | null {
  if (step === 0 && transports.length === 0) {
    return "Wybierz przynajmniej jeden środek transportu.";
  }
  if (step === 1 && !zodiacSign) {
    return "Wybierz swój znak zodiaku.";
  }
  return null;
}
