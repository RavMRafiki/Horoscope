import { z } from "zod";
import type { OpenMeteoResponse } from "./transport-expert";

const weatherSchema = z.object({
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    interval: z.number().optional(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number(),
    is_day: z.number().optional(),
    precipitation: z.number(),
    rain: z.number().optional(),
    showers: z.number().optional(),
    snowfall: z.number().optional(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    relative_humidity_2m: z.array(z.number()),
    apparent_temperature: z.array(z.number()),
    precipitation_probability: z.array(z.number()).optional(),
    precipitation: z.array(z.number()),
    rain: z.array(z.number()).optional(),
    showers: z.array(z.number()).optional(),
    snowfall: z.array(z.number()).optional(),
    weather_code: z.array(z.number()),
    visibility: z.array(z.number()).optional(),
    wind_speed_10m: z.array(z.number()),
    wind_gusts_10m: z.array(z.number()),
    is_day: z.array(z.number()).optional(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    sunrise: z.array(z.string()),
    sunset: z.array(z.string()),
  }),
});

export async function fetchTodayWeather(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    timezone: "auto",
    forecast_days: "1",
    current: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day",
      "precipitation", "rain", "showers", "snowfall", "weather_code", "cloud_cover",
      "surface_pressure", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"
    ].join(","),
    hourly: [
      "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
      "precipitation_probability", "precipitation", "rain", "showers", "snowfall",
      "weather_code", "cloud_cover", "visibility", "surface_pressure", "wind_speed_10m",
      "wind_direction_10m", "wind_gusts_10m", "uv_index"
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max",
      "apparent_temperature_min", "sunrise", "sunset", "daylight_duration",
      "sunshine_duration", "precipitation_sum", "rain_sum", "showers_sum", "snowfall_sum",
      "precipitation_probability_max", "wind_speed_10m_max", "wind_gusts_10m_max", "uv_index_max"
    ].join(",")
  });
  let response: Response;
  try {
    response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 900 }
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Open-Meteo did not respond within 15 seconds.");
    }
    throw error;
  }
  if (!response.ok) throw new Error(`Weather provider failed with status ${response.status}.`);
  const payload = weatherSchema.parse(await response.json());
  const weatherDate = Array.isArray(payload.daily.time) ? payload.daily.time[0] : null;
  if (typeof weatherDate !== "string") throw new Error("Weather provider returned no local date.");
  return { ...payload, weatherDate } as typeof payload & { weatherDate: string };
}

export type TodayWeather = Awaited<ReturnType<typeof fetchTodayWeather>>;
export type TransportWeather = Pick<TodayWeather, "current" | "hourly" | "daily"> & OpenMeteoResponse;
