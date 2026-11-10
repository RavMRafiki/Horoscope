import { NextResponse } from "next/server";
import { findNearestCity } from "@/lib/cities";
import { geolocateIp, getRequestIp, hashIp } from "@/lib/geolocation";
import { prisma } from "@/lib/prisma";
import { fetchTodayWeather } from "@/lib/weather";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = await getRequestIp(request);
  if (!ip) {
    return NextResponse.json(
      { error: "Unable to determine a public IP address. Check your internet connection and try again." },
      { status: 400 }
    );
  }

  try {
    const location = await geolocateIp(ip);
    const nearest = await findNearestCity(location.latitude, location.longitude);
    const weather = await fetchTodayWeather(nearest.city.latitude, nearest.city.longitude);
    const ipHash = await hashIp(ip);

    await prisma.weatherRequest.create({
      data: {
        ipHash,
        geolocationProvider: process.env.IP_GEOLOCATION_URL ?? "https://ipwho.is",
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
        rawResponseJson: JSON.stringify(weather)
      }
    });

    return NextResponse.json({
      location: {
        city: nearest.city.city,
        distanceKm: Math.round(nearest.distanceKm * 10) / 10,
        coordinates: {
          latitude: Number(location.latitude.toFixed(2)),
          longitude: Number(location.longitude.toFixed(2))
        }
      },
      weather: {
        date: weather.weatherDate,
        timezone: weather.timezone,
        current: weather.current,
        hourly: weather.hourly,
        daily: weather.daily
      }
    });
  } catch (error) {
    console.error("Weather request failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load today's weather." },
      { status: 502 }
    );
  }
}
