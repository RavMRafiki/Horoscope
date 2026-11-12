import type { Horoscope } from "./schema";

export type HoroscopeItem = Horoscope["ranking"][number];

export type HoroscopeResult = {
  horoscope: Horoscope;
};

export type GeneratedHoroscopeResult = {
  horoscope: Horoscope;
  source: "gemini" | "fallback";
  model: string | null;
};
