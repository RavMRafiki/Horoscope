import type { MouseEvent } from "react";
import type { WeatherResult } from "@/types/horoscope";

export function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [value, sym] of map) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out || String(num);
}

export function handleCardMove(e: MouseEvent<HTMLElement>) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -12;
  const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 12;
  card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px) scale(1.02)`;
  card.style.setProperty("--mouse-x", `${x}px`);
  card.style.setProperty("--mouse-y", `${y}px`);
}

export function handleCardLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform =
    "rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
}

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

export async function detectClientIp(): Promise<string | undefined> {
  try {
    const response = await fetch("https://api64.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const { ip } = (await response.json()) as { ip?: string };
    return ip;
  } catch {
    return undefined;
  }
}

export function requestErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Wystąpił nieznany błąd.";
}

export async function requestHoroscope(input: {
  transports: string[];
  zodiacSign: string;
  birthYear: string;
}): Promise<WeatherResult> {
  const ip = await detectClientIp();
  const response = await fetch("/api/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(ip ? { ip } : {}),
      transports: input.transports,
      zodiacSign: input.zodiacSign,
      birthYear: Number(input.birthYear),
    }),
  });
  const body = (await response.json()) as WeatherResult & { error?: string };
  if (!response.ok) {
    throw new Error(
      body.error ?? "Nie udało się przygotować rankingu. Spróbuj ponownie.",
    );
  }
  return body;
}
