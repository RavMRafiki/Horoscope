import { WMO_PL } from "./constants";
import {
  assessMode,
  buildSamples,
  parseLocal,
  windowMetrics,
  windowSamples,
} from "./engine";
import {
  TRANSPORT_MODES,
  type OpenMeteoResponse,
  type Recommendation,
  type WeatherContext,
} from "./types";

export { TRANSPORT_MODES } from "./types";
export type {
  Hazard,
  HazardVector,
  ModeAssessment,
  ModeProfile,
  OpenMeteoResponse,
  Penalty,
  Recommendation,
  TransportMode,
  Verdict,
  Veto,
  WeatherContext,
  WeatherSample,
  WeatherSummary,
  WindowMetrics,
} from "./types";

export function suggestTransport(
  weather: OpenMeteoResponse,
  ctx: WeatherContext = {},
): Recommendation {
  const modes = ctx.modes ?? TRANSPORT_MODES;
  const horizonMinutes = ctx.horizonMinutes ?? 60;
  const samples = buildSamples(weather);
  if (!samples.length) throw new Error("Brak danych godzinowych w odpowiedzi pogodowej.");

  const at = ctx.at ?? weather.current?.time ?? samples[0].time;
  const startMs = parseLocal(at);

  // Jedno okno pogodowe dla wszystkich środków – model nie zna dystansu ani czasu podróży.
  const windowed = windowSamples(samples, startMs, startMs + horizonMinutes * 60_000);
  const metrics = windowMetrics(windowed);

  const ranking = modes.map((mode) => assessMode(mode, metrics));
  ranking.sort((a, b) => Number(a.blocked) - Number(b.blocked) || b.score - a.score); // sort stabilny: remis = kolejność wejściowa

  const best = ranking.find((r) => !r.blocked) ?? null;
  const suggestions = best ? ranking.filter((r) => !r.blocked && r.score >= best.score - 5) : [];
  const usable = ranking.filter((r) => !r.blocked);
  const weatherMatters = usable.length > 0 && usable[0].score - usable[usable.length - 1].score >= 15;

  const [start] = windowSamples(samples, startMs, startMs);
  return {
    at,
    horizonMinutes,
    weather: {
      time: start.time,
      description: WMO_PL[start.weatherCode] ?? `kod WMO ${start.weatherCode}`,
      temperature: start.temperature,
      apparentTemperature: start.apparentTemperature,
      precipitationMmPerHour: Math.round(start.rain * 10) / 10,
      windKmh: start.windSpeed,
      gustsKmh: start.windGusts,
      visibilityM: start.visibility,
      isDay: start.isDay,
      hazards: metrics.hazards,
    },
    best,
    suggestions,
    weatherMatters,
    ranking,
  };
}
