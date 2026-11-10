import { z } from "zod";

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

export async function generateHoroscope(input: {
  transports: string[];
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
Rozważane środki transportu: ${JSON.stringify(input.transports)}.
Ułóż wyłącznie podane środki transportu od najlepszego do najgorszego dla dzisiejszej podróży.
Dla każdego napisz po jednym krótkim zdaniu o szczęściu, pozytywnej energii i negatywnej energii.
Zwróć wyłącznie poprawny JSON bez markdownu w formacie:
{"ranking":[{"transport":"...","rank":1,"happiness":"...","positiveEnergy":"...","negativeEnergy":"..."}]}`;
  let response: Response | undefined;
  for (const model of models) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.9 }
        }),
        signal: AbortSignal.timeout(15000)
      }
    );
    if (response.ok || ![404, 503].includes(response.status)) break;
  }
  if (!response?.ok) {
    const providerError = await response?.text();
    throw new Error(`Gemini failed with status ${response?.status ?? "unknown"} for models: ${models.join(", ")}. ${providerError?.slice(0, 240) ?? ""}`);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no horoscope.");
  return horoscopeSchema.parse(JSON.parse(text));
}
