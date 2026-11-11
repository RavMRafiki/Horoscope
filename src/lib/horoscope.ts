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
  "samolot",
] as const;

export const zodiacSigns = [
  "Baran",
  "Byk",
  "Bliźnięta",
  "Rak",
  "Lew",
  "Panna",
  "Waga",
  "Skorpion",
  "Strzelec",
  "Koziorożec",
  "Wodnik",
  "Ryby",
] as const;

const horoscopeSchema = z.object({
  ranking: z
    .array(
      z.object({
        transport: z.string(),
        rank: z.number().int().positive(),
        archetype: z.string(),
        element: z.string(),
        patronPlanet: z.string(),
        aura: z.string(),
        warning: z.string(),
        cosmicCompatibility: z.string(),
      }),
    )
    .min(1),
});

export type Horoscope = z.infer<typeof horoscopeSchema>;

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
  const sorted = [...input.transports].sort((a, b) => {
    const score = (transport: string) => {
      let value =
        transport === "pociąg" ||
        transport === "tramwaj" ||
        transport === "metro"
          ? 3
          : 2;
      if (
        precipitation > 1 &&
        ["pieszo", "rower", "hulajnoga elektryczna"].includes(transport)
      )
        value -= 2;
      if (temperature < 5 && transport === "samolot") value += 1;
      return value;
    };
    return score(b) - score(a);
  });
  return {
    ranking: sorted.map((transport, index) => ({
      transport,
      rank: index + 1,
      archetype: "Wędrowiec Miejskiej Orbity",
      element: temperature >= 15 ? "Ciepły Asfalt" : "Chłodny Przeciąg",
      patronPlanet: "Merkury w pośpiechu",
      aura: `Energia ${input.zodiacSign} prowadzi ten środek przez miejską dżunglę ${input.city}.`,
      warning:
        precipitation > 1
          ? "Deszcz kreśli śliską pułapkę na trasie."
          : "Pośpiech może chwilowo zakłócić dobry tranzyt.",
      cosmicCompatibility:
        "Harmonijny tranzyt z podróżnym, napięcie z korkami.",
    })),
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
  const configuredModel =
    process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const models = [
    configuredModel,
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ].filter((model, index, available) => available.indexOf(model) === index);
  const prompt = `Jesteś satyrycznym, mistycznym horoskopem transportowym. Twój styl to zderzenie poetyckiego żargonu ezoterycznego (retrogradacje, tranzyty, czakry, karmy, układy planet) z brutalnymi, przyziemnymi realiami miejskiej komunikacji. Nie przedstawiaj niczego jako faktów ani porad.

Użytkownik: znak zodiaku ${input.zodiacSign}, rok urodzenia ${input.birthYear}.
Najbliższe miasto: ${input.city}. Dzisiejsza pogoda: ${JSON.stringify(input.weather)}.
Środki transportu dopuszczone przez eksperta pogodowego (ocena 0–100, 100 = najlepsza pogoda): ${JSON.stringify(input.transportAssessments)}.

KRYTYCZNA ZASADA UNIKALNOŚCI:
- Każdy środek transportu MUSI otrzymać CAŁKOWICIE UNIKALNE, różne od pozostałych wartości dla każdego pola.
- BEZWZGLĘDNY ZAKAZ powielania tych samych archetypów, żywiołów, planet, przestróg czy zdań między pozycjami.
- ZAKAZ używania generycznych szablonów (np. "Energia [znak] prowadzi ten środek przez miejską dżunglę [miasto]"). Zamiast powtarzalnych formułek twórz zróżnicowane metafory.
- Cechy MUSZĄ wynikać bezpośrednio ze specyfiki fizycznej i mechaniki danego środka (np. tramwaj = szyny, pantograf, zwrotnice; taksówka = taksometr, opowieści kierowcy; car-sharing = szukanie auta w aplikacji, zapach choinki zapachowej i stan po poprzednim kierowcy; rower = łańcuch, pot, krawężniki; samochód = sprzęgło, szukanie miejsca parkingowego).

Zadania:
1. Ułóż wyłącznie podane środki transportu w rankingu od najlepszego (najwyższa ocena eksperta) do najgorszego. Nie dodawaj środków spoza listy ani nie modyfikuj ocen.
2. Dla każdego środka transportu wygeneruj obiekt z dedykowanymi, ściśle dopasowanymi do niego polami:
   - "archetype": unikalny, poetycko-ironiczny tytuł oddający naturę TYLKO tego pojazdu,
   - "element": wymyślony żywioł miejski powiązany z jego fizycznością (np. Iskry z Trakcji, Zapach Choinki Zapachowej, Płyn do Spryskiwaczy, Opłata Minutowa, Blacha Falista),
   - "patronPlanet": inna dla każdego pojazdu planeta/ciało niebieskie z ironicznym dopiskiem wyjaśniającym jego zachowanie (np. "Jowisz blokujący lewy pas", "Saturn w wiecznym remoncie", "Uran zwiastujący nagłe podbicie taryfy mnożnikiem"),
   - "aura": 1-2 zdania poetyckiego, unikalnego opisu charakteru pojazdu i jego filozofii podróży,
   - "warning": 1 zdanie – konkretna przestroga astrologiczno-drogowa charakterystyczna wyłącznie dla tego typu transportu (np. dla car-sharingu: rozładowany telefon przed zakończeniem wynajmu; dla tramwaju: zablokowana zwrotnica),
   - "cosmicCompatibility": 1 zdanie – relacja karmiczna z innym konkretnym uczestnikiem ruchu drogowego lub zjawiskiem miejskim.

Zwróć wyłącznie poprawny JSON bez formatowania markdown (bez \`\`\`json) w formacie:
{"ranking":[{"transport":"...","rank":1,"archetype":"...","element":"...","patronPlanet":"...","aura":"...","warning":"...","cosmicCompatibility":"..."}]}`;
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
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.9,
            },
          }),
          signal: AbortSignal.timeout(8000),
        },
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
    throw new Error(
      `Gemini was unavailable for all models (${failures.join(", ")}). Please try again.`,
    );
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  console.log("Gemini response payload:", JSON.stringify(payload, null, 2));
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no horoscope.");
  return horoscopeSchema.parse(JSON.parse(text));
}
