import type { Horoscope } from "./schema";

export function createFallbackHoroscope(input: {
  transports: string[];
  zodiacSign: string;
  birthYear: number;
  city: string;
  weather: Record<string, unknown>;
}): Horoscope {
  const temperature =
    typeof input.weather.temperature_2m === "number"
      ? input.weather.temperature_2m
      : 15;
  const precipitation =
    typeof input.weather.precipitation === "number"
      ? input.weather.precipitation
      : 0;

  return {
    ranking: input.transports.map((transport, index) => ({
      transport,
      rank: index + 1,
      archetype: "Wędrowiec Miejskiej Orbity",
      element: temperature >= 15 ? "Ciepły Asfalt" : "Chłodny Przeciąg",
      patronPlanet: "Merkury w pośpiechu",
      aura: `Energia ${input.zodiacSign} prowadzi ${transport} przez ${input.city}.`,
      warning:
        precipitation > 1
          ? "Deszcz kreśli śliską pułapkę na trasie."
          : "Pośpiech może chwilowo zakłócić dobry tranzyt.",
      cosmicCompatibility:
        "Harmonijny tranzyt z podróżnym, napięcie z korkami.",
    })),
  };
}
