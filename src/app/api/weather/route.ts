import { NextResponse } from "next/server";
import { findNearestCity } from "@/lib/cities";
import { geolocateIp, getRequestIp, hashIp } from "@/lib/geolocation";
import { prisma } from "@/lib/prisma";
import { fetchTodayWeather } from "@/lib/weather";
import {
  createFallbackHoroscope,
  generateHoroscope,
  transportOptions,
  zodiacSigns,
} from "@/lib/horoscope";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const location = await geolocateIp(ip);
    const nearest = await findNearestCity(
      location.latitude,
      location.longitude,
    );
    const weather = await fetchTodayWeather(
      nearest.city.latitude,
      nearest.city.longitude,
    );
    let horoscope;
    try {
      horoscope = await generateHoroscope({
        transports: input.data.transports,
        zodiacSign: input.data.zodiacSign,
        birthYear: input.data.birthYear,
        city: nearest.city.city,
        weather: weather.current,
      });
    } catch (horoscopeError) {
      console.warn(
        "Gemini unavailable; using local horoscope fallback",
        horoscopeError,
      );
      horoscope = createFallbackHoroscope({
        transports: input.data.transports,
        zodiacSign: input.data.zodiacSign,
        birthYear: input.data.birthYear,
        city: nearest.city.city,
        weather: weather.current,
      });
    }
    const ipHash = await hashIp(ip);

    await prisma.weatherRequest.create({
      data: {
        ipHash,
        geolocationProvider:
          process.env.IP_GEOLOCATION_URL ?? "https://ipwho.is",
        estimatedLatitude: location.latitude,
        estimatedLongitude: location.longitude,
        locationAccuracy: location.accuracy,
        matchedCity: nearest.city.city,
        cityLatitude: nearest.city.latitude,
        cityLongitude: nearest.city.longitude,
        distanceKm: nearest.distanceKm,
        weatherDate: weather.weatherDate,
        timezone: weather.timezone,
        currentJson: JSON.stringify(weather.current),
        hourlyJson: JSON.stringify(weather.hourly),
        dailyJson: JSON.stringify(weather.daily),
        rawResponseJson: JSON.stringify(weather),
        transportsJson: JSON.stringify(input.data.transports),
        zodiacSign: input.data.zodiacSign,
        birthYear: input.data.birthYear,
        horoscopeJson: JSON.stringify(horoscope),
      },
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
