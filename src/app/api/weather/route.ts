import { NextResponse } from "next/server";
import { findNearestCity } from "@/lib/cities";
import { getOrCreateIpLocation, getRequestIp } from "@/lib/geolocation";
import { prisma } from "@/lib/prisma";
import { getOrFetchCityWeather, type CachedCityWeather } from "@/lib/weather";
import {
  buildHoroscopeRequestKey,
  generateHoroscope,
  transportOptions,
  zodiacSigns,
  type Horoscope,
} from "@/lib/horoscope";
import {
  suggestTransport,
  type ModeAssessment,
  type Recommendation,
  type TransportMode,
} from "@/lib/transport-expert";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      if (raced)
        return {
          id: raced.id,
          result: JSON.parse(raced.resultJson) as Recommendation,
        };
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
  weatherCurrent: CachedCityWeather["current"];
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
    weather: input.weatherCurrent as unknown as Record<string, unknown>,
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = z
    .object({
      ip: z.string().optional(),
      transports: z
        .array(z.enum(transportOptions))
        .min(1)
        .max(transportOptions.length),
      zodiacSign: z.enum(zodiacSigns),
      birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
    })
    .safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      {
        error:
          "Wybierz co najmniej jeden środek transportu, znak zodiaku i poprawny rok urodzenia.",
      },
      { status: 400 },
    );
  }
  const ip = await getRequestIp(request, body);
  if (!ip) {
    return NextResponse.json(
      {
        error:
          "Unable to determine a public IP address. Check your internet connection and try again.",
      },
      { status: 400 },
    );
  }

  try {
    const location = await getOrCreateIpLocation(ip);
    const nearest = await findNearestCity(
      location.latitude,
      location.longitude,
    );
    const weather = await getOrFetchCityWeather(
      nearest.city.city,
      nearest.city.latitude,
      nearest.city.longitude,
    );

    const expert = await getOrCreateExpertResult({
      weatherId: weather.id,
      transports: input.data
        .transports as readonly TransportMode[] as TransportMode[],
      weather,
    });
    const transportExpert = expert.result;
    const filteredAssessments =
      transportExpert.suggestions.length > 0
        ? transportExpert.suggestions
        : transportExpert.ranking;
    const filteredTransports = filteredAssessments.map(
      (assessment) => assessment.mode,
    );

    const horoscope = await getOrCreateLlmHoroscope({
      weatherId: weather.id,
      expertId: expert.id,
      transports: filteredTransports,
      transportAssessments: filteredAssessments,
      zodiacSign: input.data.zodiacSign,
      birthYear: input.data.birthYear,
      city: nearest.city.city,
      weatherCurrent: weather.current,
    });

    return NextResponse.json({
      location: {
        city: nearest.city.city,
        distanceKm: Math.round(nearest.distanceKm * 10) / 10,
        coordinates: {
          latitude: Number(location.latitude.toFixed(2)),
          longitude: Number(location.longitude.toFixed(2)),
        },
      },
      weather: {
        date: weather.weatherDate,
        timezone: weather.timezone,
        current: weather.current,
        hourly: weather.hourly,
        daily: weather.daily,
      },
      transportExpert,
      horoscope,
    });
  } catch (error) {
    console.error("Weather request failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load today's weather.",
      },
      { status: 502 },
    );
  }
}
