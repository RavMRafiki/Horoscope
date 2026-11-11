import type { Horoscope } from "./schema";

export type GeneratedHoroscopeResult = {
  horoscope: Horoscope;
  source: "gemini" | "fallback";
  model: string | null;
};
