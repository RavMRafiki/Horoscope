export function isValidBirthYear(birthYear: string): boolean {
  if (!birthYear || !birthYear.trim()) return false;
  const year = Number(birthYear.trim());
  const maxYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= maxYear;
}

export function isOnboardingValid(
  transports: string[],
  zodiacSign: string,
  birthYear: string,
): boolean {
  return (
    transports.length > 0 &&
    Boolean(zodiacSign) &&
    isValidBirthYear(birthYear)
  );
}

export function validateStep(
  step: number,
  transports: string[],
  zodiacSign: string,
  birthYear?: string,
): string | null {
  if (step === 0 && transports.length === 0) {
    return "Wybierz przynajmniej jeden środek transportu.";
  }
  if (step === 1 && !zodiacSign) {
    return "Wybierz swój znak zodiaku.";
  }
  if (step === 2 && birthYear !== undefined && !isValidBirthYear(birthYear)) {
    return `Podaj poprawny rok urodzenia (1900–${new Date().getFullYear()}).`;
  }
  return null;
}
