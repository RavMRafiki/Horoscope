import {
  FOG_CODES,
  FREEZING_CODES,
  HAZARDS,
  HOUR_MS,
  RAIN_CODE_FLOOR,
  SNOW_CODE_FLOOR,
  THUNDER_CODES,
} from "./constants";
import { MODE_PROFILES } from "./profiles";
import type {
  Hazard,
  HazardVector,
  ModeAssessment,
  OpenMeteoResponse,
  Penalty,
  TransportMode,
  Verdict,
  WeatherSample,
  WindowMetrics,
} from "./types";

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Liniowa funkcja przynależności: 0 w x0, 1 w x1 (działa także malejąco, gdy x0 > x1). */
const ramp = (x: number, x0: number, x1: number) => clamp((x - x0) / (x1 - x0), 0, 1);
/** Czas lokalny z Open-Meteo traktujemy jako "ścienny" – liczymy tylko różnice. */
export const parseLocal = (iso: string) => Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
const emptyVector = (): HazardVector =>
  Object.fromEntries(HAZARDS.map((h) => [h, 0])) as HazardVector;

function isDayFromDaily(daily: OpenMeteoResponse["daily"], isoHourStart: string): boolean {
  if (!daily) return true;
  const idx = daily.time.indexOf(isoHourStart.slice(0, 10));
  if (idx < 0) return true;
  // środek godziny jako reprezentant całego przedziału
  const mid = parseLocal(isoHourStart) + HOUR_MS / 2;
  return mid >= parseLocal(daily.sunrise[idx]) && mid <= parseLocal(daily.sunset[idx]);
}

export function buildSamples(weather: OpenMeteoResponse): WeatherSample[] {
  const h = weather.hourly;
  const samples: WeatherSample[] = h.time.map((time, i) => {
    const snowfall = h.snowfall?.[i] ?? 0;
    // 1 cm śniegu ≈ 0,7 mm opadu – używane tylko, gdy brak osobnego pola `rain`
    const rain =
      (h.rain?.[i] ?? Math.max(0, h.precipitation[i] - snowfall * 0.7)) + (h.showers?.[i] ?? 0);
    const from = Math.max(0, i - 6);
    return {
      time,
      temperature: h.temperature_2m[i],
      apparentTemperature: h.apparent_temperature[i],
      humidity: h.relative_humidity_2m[i],
      rain,
      snowfall,
      precipitationProbability: h.precipitation_probability?.[i] ?? 0,
      weatherCode: h.weather_code[i],
      visibility: h.visibility?.[i] ?? 20_000,
      windSpeed: h.wind_speed_10m[i],
      windGusts: h.wind_gusts_10m[i],
      isDay: h.is_day ? h.is_day[i] === 1 : isDayFromDaily(weather.daily, time),
      recentMinTemperature: Math.min(...h.temperature_2m.slice(from, i + 1)),
    };
  });

  // Bieżącą godzinę nadpisujemy danymi `current` (dokładniejsze niż prognoza godzinowa).
  const c = weather.current;
  if (c) {
    const idx = samples.findIndex((s) => s.time.slice(0, 13) === c.time.slice(0, 13));
    if (idx >= 0) {
      const base = samples[idx];
      // Opad w `current` to suma z poprzedniego interwału (np. 15 min) -> przeliczamy na mm/h.
      const k = 3600 / (c.interval ?? 3600);
      const cRain = ((c.rain ?? c.precipitation) + (c.showers ?? 0)) * k;
      samples[idx] = {
        ...base,
        temperature: c.temperature_2m,
        apparentTemperature: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        rain: cRain,
        snowfall: (c.snowfall ?? base.snowfall) * k,
        weatherCode: c.weather_code,
        windSpeed: c.wind_speed_10m,
        windGusts: c.wind_gusts_10m,
        isDay: c.is_day !== undefined ? c.is_day === 1 : base.isDay,
        recentMinTemperature: Math.min(base.recentMinTemperature, c.temperature_2m),
      };
    }
  }
  return samples;
}

/** Ryzyko gołoledzi / śliskiej nawierzchni 0..1. */
function iceRisk(s: WeatherSample): number {
  if (FREEZING_CODES.has(s.weatherCode)) return 1;
  const wet = s.rain > 0.05 || s.snowfall > 0.05 || s.humidity >= 90;
  if (s.temperature <= 0) return wet ? 0.85 : s.humidity >= 85 ? 0.55 : 0.4;
  if (s.temperature <= 3) {
    // Nawierzchnia bywa zimniejsza od powietrza, jeśli niedawno był mróz.
    const groundStillCold = s.recentMinTemperature <= 0;
    if (s.rain > 0.05) return clamp((s.temperature <= 1 ? 0.35 : 0.15) + (groundStillCold ? 0.3 : 0), 0, 0.8);
    if (groundStillCold && s.humidity >= 90) return 0.2;
  }
  return 0;
}

/** Surowe wartości -> nasilenie zjawisk 0..1. */
function assessSample(s: WeatherSample): HazardVector {
  const code = s.weatherCode;
  const app = s.apparentTemperature;
  return {
    rain: Math.max(
      1 - Math.exp(-s.rain / 2.5), // 0,5 mm/h≈0,18 · 2 mm/h≈0,55 · 5 mm/h≈0,86
      RAIN_CODE_FLOOR[code] ?? 0,
      0.25 * (s.precipitationProbability / 100),
    ),
    snow: Math.max(1 - Math.exp(-s.snowfall / 0.6), SNOW_CODE_FLOOR[code] ?? 0),
    cold: ramp(app, 10, -15), // temperatura odczuwalna: 10 °C -> 0, -15 °C -> 1
    heat: ramp(app, 25, 38),
    wind: ramp(Math.max(s.windGusts, s.windSpeed * 1.5), 20, 80),
    fog: Math.max(ramp(s.visibility, 4000, 200), FOG_CODES.has(code) ? 0.8 : 0),
    ice: iceRisk(s),
    storm: THUNDER_CODES.has(code) ? 1 : 0,
    dark: s.isDay ? 0 : 1,
  };
}

export function windowMetrics(samples: WeatherSample[]): WindowMetrics {
  const vectors = samples.map(assessSample);
  const hazards = emptyVector();
  const peak = emptyVector();
  for (const hz of HAZARDS) {
    const vals = vectors.map((v) => v[hz]);
    peak[hz] = Math.max(...vals);
    hazards[hz] = 0.5 * peak[hz] + 0.5 * (vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return {
    hazards,
    peak,
    maxRain: Math.max(...samples.map((s) => s.rain)),
    maxSnow: Math.max(...samples.map((s) => s.snowfall)),
    maxGust: Math.max(...samples.map((s) => s.windGusts)),
    minVisibility: Math.min(...samples.map((s) => s.visibility)),
    minTemp: Math.min(...samples.map((s) => s.temperature)),
    minApparent: Math.min(...samples.map((s) => s.apparentTemperature)),
    maxApparent: Math.max(...samples.map((s) => s.apparentTemperature)),
  };
}

/** Próbki godzinowe zachodzące na przedział [startMs, endMs]. */
export function windowSamples(samples: WeatherSample[], startMs: number, endMs: number): WeatherSample[] {
  const inWindow = samples.filter((s) => {
    const t = parseLocal(s.time);
    return t <= endMs && t + HOUR_MS > startMs;
  });
  if (inWindow.length) return inWindow;
  // Poza zakresem prognozy -> najbliższa próbka
  const nearest = samples.reduce((best, s) =>
    Math.abs(parseLocal(s.time) - startMs) < Math.abs(parseLocal(best.time) - startMs) ? s : best,
  );
  return [nearest];
}

function penaltyText(h: Hazard, m: WindowMetrics): string {
  switch (h) {
    case "rain": return `opady deszczu (do ${m.maxRain.toFixed(1)} mm/h)`;
    case "snow": return `opady śniegu (do ${m.maxSnow.toFixed(1)} cm/h)`;
    case "cold": return `chłód (odczuwalna ${m.minApparent.toFixed(0)}°C)`;
    case "heat": return `upał (odczuwalna ${m.maxApparent.toFixed(0)}°C)`;
    case "wind": return `silny wiatr (porywy do ${m.maxGust.toFixed(0)} km/h)`;
    case "fog": return `ograniczona widoczność (${(m.minVisibility / 1000).toFixed(1)} km)`;
    case "ice": return "ryzyko śliskiej nawierzchni / gołoledzi";
    case "storm": return "burza";
    case "dark": return "po zmroku";
  }
}

const verdictFor = (score: number, blocked: boolean): Verdict =>
  blocked ? "wykluczony" : score >= 80 ? "polecany" : score >= 60 ? "dobry" : score >= 40 ? "z zastrzeżeniami" : "odradzany";

export function assessMode(mode: TransportMode, m: WindowMetrics): ModeAssessment {
  const p = MODE_PROFILES[mode];

  const penalties: Penalty[] = [];
  for (const hz of HAZARDS) {
    const pts = p.weights[hz] * m.hazards[hz];
    if (pts >= 0.5) penalties.push({ factor: hz, points: pts, text: penaltyText(hz, m) });
  }
  // Synergie
  const wetCold = 25 * m.hazards.rain * m.hazards.cold * p.exposure;
  if (wetCold >= 0.5) penalties.push({ factor: "wet-cold", points: wetCold, text: "jednoczesne zmoczenie i chłód" });
  const darkVis = 12 * p.vulnerability * m.hazards.dark * Math.max(m.hazards.rain, m.hazards.fog, m.hazards.ice);
  if (darkVis >= 0.5) penalties.push({ factor: "dark-visibility", points: darkVis, text: "słaba widoczność po zmroku" });

  penalties.sort((a, b) => b.points - a.points);

  const vetoReasons = p.vetoes.filter((v) => v.when(m)).map((v) => v.reason);
  const blocked = vetoReasons.length > 0;

  const totalPenalty = penalties.reduce((s, x) => s + x.points, 0);
  const score = blocked ? 0 : Math.round(clamp(100 - totalPenalty, 0, 100));

  const reasons = blocked
    ? vetoReasons
    : penalties.filter((x) => x.points >= 2).slice(0, 3).map((x) => `${x.text} (−${Math.round(x.points)} pkt)`);

  return { mode, score, verdict: verdictFor(score, blocked), blocked, reasons, penalties };
}
