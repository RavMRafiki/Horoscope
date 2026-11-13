import { findNearestCity } from "@/lib/server/cities";
import { getOrCreateIpLocation } from "@/lib/server/geolocation";
import { prisma } from "@/lib/server/prisma";
import {
  getOrFetchCityWeather,
  type CachedCityWeather,
} from "@/lib/server/weather";
import {
  buildHoroscopeRequestKey,
  generateHoroscope,
  type Horoscope,
} from "@/lib/domain/horoscope";
import {
  suggestTransport,
  type ModeAssessment,
  type Recommendation,
  type TransportMode,
} from "@/lib/domain/transport-expert";

export type HoroscopeRequestInput = {
  transports: TransportMode[];
  zodiacSign: string;
  birthYear: number;
};

function buildTransportsKey(transports: string[]): string {
  return [...transports].sort().join("|");
}

async function getOrCreateExpertResult(input: {
  weatherId: string;
  transports: TransportMode[];
  weather: CachedCityWeather;
}): Promise<{ id: string; result: Recommendation }> {
  const transportsKey = buildTransportsKey(input.transports);
  const existing = await prisma.expertResult.findUnique({
    where: {
      weatherId_transportsKey: { weatherId: input.weatherId, transportsKey },
    },
  });
  if (existing) {
    return {
      id: existing.id,
      result: JSON.parse(existing.resultJson) as Recommendation,
    };
  }

  const result = suggestTransport(
    {
      current: input.weather.current,
      hourly: input.weather.hourly,
      daily: input.weather.daily,
    },
    { modes: input.transports },
  );
  const data = {
    weatherId: input.weatherId,
    transportsKey,
    transportsInputJson: JSON.stringify(input.transports),
    resultJson: JSON.stringify(result),
  };
  try {
    const created = await prisma.expertResult.create({ data });
    return { id: created.id, result };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      const raced = await prisma.expertResult.findUnique({
        where: {
          weatherId_transportsKey: {
            weatherId: input.weatherId,
            transportsKey,
          },
        },
      });
      if (raced) {
        return {
          id: raced.id,
          result: JSON.parse(raced.resultJson) as Recommendation,
        };
      }
    }
    throw error;
  }
}

async function getOrCreateLlmHoroscope(input: {
  weatherId: string;
  expertId: string;
  transports: string[];
  transportAssessments: ModeAssessment[];
  zodiacSign: string;
  birthYear: number;
  city: string;
}): Promise<Horoscope> {
  const configuredModel =
    process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const requestKey = await buildHoroscopeRequestKey({
    weatherId: input.weatherId,
    expertId: input.expertId,
    transports: input.transports,
    transportAssessments: input.transportAssessments,
    zodiacSign: input.zodiacSign,
    birthYear: input.birthYear,
    city: input.city,
    model: configuredModel,
  });

  const existing = await prisma.llmHoroscope.findUnique({
    where: { requestKey },
  });
  if (existing) {
    return JSON.parse(existing.horoscopeJson) as Horoscope;
  }

  const generated = await generateHoroscope({
    transports: input.transports,
    transportAssessments: input.transportAssessments,
    zodiacSign: input.zodiacSign,
    birthYear: input.birthYear,
    city: input.city,
  });

  const data = {
    weatherId: input.weatherId,
    expertId: input.expertId,
    zodiacSign: input.zodiacSign,
    birthYear: input.birthYear,
    requestKey,
    source: generated.source,
    model: generated.model,
    transportsJson: JSON.stringify(input.transports),
    assessmentsJson: JSON.stringify(input.transportAssessments),
    horoscopeJson: JSON.stringify(generated.horoscope),
  };

  try {
    await prisma.llmHoroscope.create({ data });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      const raced = await prisma.llmHoroscope.findUnique({
        where: { requestKey },
      });
      if (raced) return JSON.parse(raced.horoscopeJson) as Horoscope;
    } else {
      throw error;
    }
  }

  return generated.horoscope;
}

export async function createHoroscopeRanking(
  ip: string,
  input: HoroscopeRequestInput,
): Promise<Horoscope> {
  const location = await getOrCreateIpLocation(ip);
  const nearest = await findNearestCity(location.latitude, location.longitude);
  const weather = await getOrFetchCityWeather(
    nearest.city.city,
    nearest.city.latitude,
    nearest.city.longitude,
  );

  const expert = await getOrCreateExpertResult({
    weatherId: weather.id,
    transports: input.transports,
    weather,
  });
  const transportAssessments = expert.result.ranking;
  const transports = transportAssessments.map((assessment) => assessment.mode);

  return getOrCreateLlmHoroscope({
    weatherId: weather.id,
    expertId: expert.id,
    transports,
    transportAssessments,
    zodiacSign: input.zodiacSign,
    birthYear: input.birthYear,
    city: nearest.city.city,
  });
}
