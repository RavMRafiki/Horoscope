import { z } from "zod";
import type { ModeAssessment } from "./transport-expert";

export const transportOptions = [
  "pieszo",
  "rower",
  "hulajnoga elektryczna",
  "motocykl",
  "skuter lub motorower",
  "samochód",
  "taksówka",
  "car-sharing",
  "autobus",
  "tramwaj",
  "metro",
  "pociąg",
  "prom",
  "samolot"
] as const;

export const zodiacSigns = [
  "Baran", "Byk", "Bliźnięta", "Rak", "Lew", "Panna",
  "Waga", "Skorpion", "Strzelec", "Koziorożec", "Wodnik", "Ryby"
] as const;

const horoscopeSchema = z.object({
  ranking: z.array(z.object({
    transport: z.string(),
    rank: z.number().int().positive(),
    happiness: z.string(),
    positiveEnergy: z.string(),
    negativeEnergy: z.string()
  })).min(1)
});

export type Horoscope = z.infer<typeof horoscopeSchema>;

export function createFallbackHoroscope(input: {
  transports: string[];
  zodiacSign: string;
  birthYear: number;
  city: string;
  weather: Record<string, unknown>;
}): Horoscope {
  const temperature = typeof input.weather.temperature_2m === "number"
    ? input.weather.temperature_2m
    : 15;
  const precipitation = typeof input.weather.precipitation === "number"
    ? input.weather.precipitation
    : 0;
  const sorted = [...input.transports].sort((a, b) => {
    const score = (transport: string) => {
      let value = transport === "pociąg" || transport === "tramwaj" || transport === "metro" ? 3 : 2;
      if (precipitation > 1 && ["pieszo", "rower", "hulajnoga elektryczna"].includes(transport)) value -= 2;
      if (temperature < 5 && transport === "samolot") value += 1;
      return value;
    };
    return score(b) - score(a);
  });
  return {
    ranking: sorted.map((transport, index) => ({
      transport,
      rank: index + 1,
      happiness: `Energia ${input.zodiacSign} sprzyja dziś temu wyborowi w okolicach ${input.city}.`,
      positiveEnergy: `Pogoda daje mu ${temperature >= 15 ? "ciepły" : "spokojny"} impuls.`,
      negativeEnergy: precipitation > 1 ? "Deszcz może lekko osłabić jego aurę." : "Pośpiech może chwilowo zakłócić dobrą energię."
    }))
  };
}

export async function generateHoroscope(input: {
  transports: string[];
  transportAssessments: ModeAssessment[];
  zodiacSign: string;
  birthYear: number;
  city: string;
  weather: Record<string, unknown>;
}): Promise<Horoscope> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const configuredModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const models = [
    configuredModel,
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest"
  ].filter((model, index, available) => available.indexOf(model) === index);
  const prompt = `Jesteś lekkim, rozrywkowym horoskopem. Nie przedstawiaj tego jako faktów ani porady.
Użytkownik: znak zodiaku ${input.zodiacSign}, rok urodzenia ${input.birthYear}.
Najbliższe miasto: ${input.city}. Dzisiejsza pogoda: ${JSON.stringify(input.weather)}.
Środki transportu dopuszczone przez eksperta pogodowego (ocena 0–100, 100 = najlepsza pogoda): ${JSON.stringify(input.transportAssessments)}.
Ułóż wyłącznie podane środki transportu od najlepszego do najgorszego dla dzisiejszej podróży.
Nie zmieniaj ocen eksperta ani nie dodawaj środków spoza tej listy.
Dla każdego napisz po jednym krótkim zdaniu o szczęściu, pozytywnej energii i negatywnej energii.
Zwróć wyłącznie poprawny JSON bez markdownu w formacie:
{"ranking":[{"transport":"...","rank":1,"happiness":"...","positiveEnergy":"...","negativeEnergy":"..."}]}`;
  let response: Response | undefined;
  const failures: string[] = [];
  for (const model of models) {
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.9 }
          }),
          signal: AbortSignal.timeout(8000)
        }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        failures.push(`${model}: timeout`);
        continue;
      }
      throw error;
    }
    if (response.ok) break;
    if (![404, 429, 503].includes(response.status)) break;
    failures.push(`${model}: HTTP ${response.status}`);
  }
  if (!response?.ok) {
    throw new Error(`Gemini was unavailable for all models (${failures.join(", ")}). Please try again.`);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no horoscope.");
  return horoscopeSchema.parse(JSON.parse(text));
}
