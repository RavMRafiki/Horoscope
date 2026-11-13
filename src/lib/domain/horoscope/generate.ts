import type { ModeAssessment } from "../transport-expert";
import { createFallbackHoroscope } from "./fallback";
import { horoscopeSchema } from "./schema";
import type { GeneratedHoroscopeResult } from "./types";

export async function generateHoroscope(input: {
  transports: string[];
  transportAssessments: ModeAssessment[];
  zodiacSign: string;
  birthYear: number;
  city: string;
  weather: Record<string, unknown>;
}): Promise<GeneratedHoroscopeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      horoscope: createFallbackHoroscope({
        ...input,
        transportAssessments: input.transportAssessments,
      }),
      source: "fallback",
      model: null,
    };
  }
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
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
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
    if (response.ok) {
      let payload: {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      try {
        payload = (await response.json()) as typeof payload;
      } catch {
        failures.push(`${model}: invalid JSON`);
        response = undefined;
        continue;
      }
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        try {
          return {
            horoscope: horoscopeSchema.parse(JSON.parse(text)),
            source: "gemini",
            model,
          };
        } catch {
          failures.push(`${model}: invalid response`);
        }
      } else {
        failures.push(`${model}: empty response`);
      }
      response = undefined;
      continue;
    }
    if (![404, 429, 503].includes(response.status)) {
      failures.push(`${model}: HTTP ${response.status}`);
      break;
    }
    failures.push(`${model}: HTTP ${response.status}`);
  }
  console.warn(
    "Gemini unavailable; using local horoscope fallback",
    failures.join(", "),
  );
  return {
    horoscope: createFallbackHoroscope({
      ...input,
      transportAssessments: input.transportAssessments,
    }),
    source: "fallback",
    model: null,
  };
}
