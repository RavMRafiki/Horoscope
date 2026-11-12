"use client";

import type { HoroscopeResult } from "@/lib/domain/horoscope";

const horoscopeCache = new Map<string, HoroscopeResult>();
let cachedClientIp: string | null | undefined;

export async function detectClientIp(): Promise<string | undefined> {
  if (cachedClientIp !== undefined) {
    return cachedClientIp ?? undefined;
  }
  try {
    const response = await fetch("https://api64.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) {
      cachedClientIp = null;
      return undefined;
    }
    const { ip } = (await response.json()) as { ip?: string };
    cachedClientIp = ip ?? null;
    return ip;
  } catch {
    cachedClientIp = null;
    return undefined;
  }
}

export function requestErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Wystąpił nieznany błąd.";
}

function horoscopeCacheKey(input: {
  transports: string[];
  zodiacSign: string;
  birthYear: string;
}): string {
  return JSON.stringify({
    transports: [...input.transports].sort(),
    zodiacSign: input.zodiacSign,
    birthYear: input.birthYear,
  });
}

export async function requestHoroscope(input: {
  transports: string[];
  zodiacSign: string;
  birthYear: string;
}): Promise<HoroscopeResult> {
  const key = horoscopeCacheKey(input);
  const cached = horoscopeCache.get(key);
  if (cached) {
    return cached;
  }

  const ip = await detectClientIp();
  const response = await fetch("/api/horoscope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(ip ? { ip } : {}),
      transports: input.transports,
      zodiacSign: input.zodiacSign,
      birthYear: Number(input.birthYear),
    }),
  });
  const body = (await response.json()) as HoroscopeResult & { error?: string };
  if (!response.ok) {
    throw new Error(
      body.error ?? "Nie udało się przygotować rankingu. Spróbuj ponownie.",
    );
  }
  horoscopeCache.set(key, body);
  return body;
}
