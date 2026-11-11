/**
 * Model ekspercki: sugestia środka transportu na podstawie WYŁĄCZNIE pogody.
 *
 * Wejście : odpowiedź Open-Meteo (current + hourly [+ daily]).
 * Wyjście : ocena pogodowa każdego środka (0–100) z uzasadnieniem + krótka lista sugestii.
 *
 * Model nie zna dystansu, trasy, kosztu ani dostępności – to tylko podpowiedź
 * "jak pogoda wpływa na komfort i bezpieczeństwo danego środka", a decyzję
 * podejmuje użytkownik. Równe wyniki oznaczają, że pogoda ich nie różnicuje.
 *
 * Architektura (klasyczny system ekspercki):
 *  1. Fakty        – buildSamples()  : normalizacja danych do próbek godzinowych
 *  2. Fuzyfikacja  – assessSample()  : surowe wartości -> nasilenie zjawisk 0..1
 *  3. Baza wiedzy  – MODE_PROFILES   : wagi wrażliwości i reguły wykluczające (veta)
 *  4. Wnioskowanie – assessMode()    : kara = waga × nasilenie + synergie
 *  5. Wyjaśnienia  – penalties / reasons
 *
 * Brak zależności zewnętrznych. Wagi = punkty karne przy nasileniu zjawiska równym 1
 * i typowej, krótkiej podróży (dla środków otwartych ok. 20–30 min na zewnątrz).
 */

// ───────────────────────────── Typy publiczne ─────────────────────────────

export const TRANSPORT_MODES = [
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

export type TransportMode = (typeof TRANSPORT_MODES)[number];

/** Podzbiór odpowiedzi Open-Meteo, którego używa model. */
export interface OpenMeteoResponse {
  current?: {
    time: string;
    /** sekundy; opad w `current` jest sumą z poprzedniego interwału (np. 900 s = 15 min) */
    interval?: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day?: number;
    precipitation: number;
    rain?: number;
    showers?: number;
    snowfall?: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    apparent_temperature: number[];
    precipitation_probability?: number[];
    precipitation: number[];
    rain?: number[];
    showers?: number[];
    snowfall?: number[];
    weather_code: number[];
    visibility?: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    is_day?: number[];
  };
  daily?: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
}

export interface WeatherContext {
  /** Które środki oceniać (np. te dostępne dla użytkownika). Domyślnie wszystkie. */
  modes?: readonly TransportMode[];
  /** Lokalny czas "YYYY-MM-DDTHH:mm", od którego oceniamy pogodę. Domyślnie `current.time`. */
  at?: string;
  /** Jak daleko w przód patrzymy na pogodę, w minutach. Domyślnie 60. */
  horizonMinutes?: number;
}

export type Verdict =
  | "polecany"
  | "dobry"
  | "z zastrzeżeniami"
  | "odradzany"
  | "wykluczony";

export type Hazard =
  | "rain"
  | "snow"
  | "cold"
  | "heat"
  | "wind"
  | "fog"
  | "ice"
  | "storm"
  | "dark";

export type HazardVector = Record<Hazard, number>;

export interface Penalty {
  factor: Hazard | "wet-cold" | "dark-visibility";
  points: number;
  text: string;
}

export interface ModeAssessment {
  mode: TransportMode;
  /** Ocena pogodowa 0–100 (100 = pogoda w ogóle nie przeszkadza). */
  score: number;
  verdict: Verdict;
  /** true, gdy zadziałała reguła wykluczająca (wtedy score = 0). */
  blocked: boolean;
  /** Najważniejsze powody obniżenia oceny albo wykluczenia (po polsku). */
  reasons: string[];
  penalties: Penalty[];
}

export interface WeatherSummary {
  time: string;
  description: string;
  temperature: number;
  apparentTemperature: number;
  precipitationMmPerHour: number;
  windKmh: number;
  gustsKmh: number;
  visibilityM: number;
  isDay: boolean;
  /** Nasilenie zjawisk 0..1 w oknie oceny. */
  hazards: HazardVector;
}

export interface Recommendation {
  at: string;
  horizonMinutes: number;
  weather: WeatherSummary;
  /** Środek z najwyższą oceną (przy remisie – pierwszy w kolejności TRANSPORT_MODES). */
  best: ModeAssessment | null;
  /** Środki o ocenie do 5 pkt niższej niż najlepsza, bez wykluczonych. To jest "podpowiedź", nie werdykt. */
  suggestions: ModeAssessment[];
  /**
   * false, gdy pogoda prawie nie różnicuje środków (rozstęp ocen < 15 pkt) –
   * wtedy `suggestions` obejmuje praktycznie wszystko i UI może napisać "pogoda nie ogranicza wyboru".
   */
  weatherMatters: boolean;
  /** Wszystkie oceniane środki, malejąco; wykluczone na końcu. */
  ranking: ModeAssessment[];
}

// ───────────────────────────── Narzędzia ─────────────────────────────

const HOUR_MS = 3_600_000;
const HAZARDS: readonly Hazard[] = ["rain", "snow", "cold", "heat", "wind", "fog", "ice", "storm", "dark"];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Liniowa funkcja przynależności: 0 w x0, 1 w x1 (działa także malejąco, gdy x0 > x1). */
const ramp = (x: number, x0: number, x1: number) => clamp((x - x0) / (x1 - x0), 0, 1);
/** Czas lokalny z Open-Meteo traktujemy jako "ścienny" – liczymy tylko różnice. */
const parseLocal = (iso: string) => Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
const emptyVector = (): HazardVector =>
  Object.fromEntries(HAZARDS.map((h) => [h, 0])) as HazardVector;

// ───────────────────────────── 1. Fakty ─────────────────────────────

interface WeatherSample {
  /** Początek godziny (lokalny ISO). */
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  rain: number; // mm/h
  snowfall: number; // cm/h
  precipitationProbability: number; // 0–100
  weatherCode: number;
  visibility: number; // m
  windSpeed: number; // km/h
  windGusts: number; // km/h
  isDay: boolean;
  /** Minimalna temperatura z ostatnich ~6 h (ocena wychłodzenia podłoża). */
  recentMinTemperature: number;
}

function isDayFromDaily(daily: OpenMeteoResponse["daily"], isoHourStart: string): boolean {
  if (!daily) return true;
  const idx = daily.time.indexOf(isoHourStart.slice(0, 10));
  if (idx < 0) return true;
  // środek godziny jako reprezentant całego przedziału
  const mid = parseLocal(isoHourStart) + HOUR_MS / 2;
  return mid >= parseLocal(daily.sunrise[idx]) && mid <= parseLocal(daily.sunset[idx]);
}

function buildSamples(weather: OpenMeteoResponse): WeatherSample[] {
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

// ───────────────────────────── 2. Fuzyfikacja ─────────────────────────────

const THUNDER_CODES = new Set([95, 96, 99]);
const FOG_CODES = new Set([45, 48]);
const FREEZING_CODES = new Set([56, 57, 66, 67]);
/** Minimalne nasilenie deszczu wynikające z kodu WMO (gdy liczby są zaniżone). */
const RAIN_CODE_FLOOR: Record<number, number> = {
  51: 0.1, 53: 0.2, 55: 0.35, 56: 0.25, 57: 0.4, 61: 0.25, 63: 0.5, 65: 0.85,
  66: 0.4, 67: 0.7, 80: 0.3, 81: 0.6, 82: 0.95, 95: 0.7, 96: 0.8, 99: 0.9,
};
const SNOW_CODE_FLOOR: Record<number, number> = { 71: 0.25, 73: 0.5, 75: 0.85, 77: 0.3, 85: 0.4, 86: 0.8 };

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

interface WindowMetrics {
  /** Agregacja po oknie: 0,5·max + 0,5·średnia (najgorszy moment waży tyle co średnia). */
  hazards: HazardVector;
  peak: HazardVector;
  maxRain: number;
  maxSnow: number;
  maxGust: number;
  minVisibility: number;
  minTemp: number;
  minApparent: number;
  maxApparent: number;
}

function windowMetrics(samples: WeatherSample[]): WindowMetrics {
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
function windowSamples(samples: WeatherSample[], startMs: number, endMs: number): WeatherSample[] {
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

// ───────────────────────────── 3. Baza wiedzy ─────────────────────────────

interface Veto {
  when: (m: WindowMetrics) => boolean;
  reason: string;
}

interface ModeProfile {
  /** 0–1: jak bardzo użytkownik jest wystawiony na pogodę (jazda na otwartym powietrzu, przystanki, dojście). */
  exposure: number;
  /** 0–1: podatność na bycie niewidocznym / poślizg (pieszy, rowerzysta, motocyklista). */
  vulnerability: number;
  /** Punkty karne przy nasileniu zjawiska = 1. */
  weights: HazardVector;
  /** Reguły wykluczające – przy spełnieniu środek jest odradzany jako niebezpieczny/niewykonalny. */
  vetoes: Veto[];
}

// kolejność: deszcz, śnieg, chłód, upał, wiatr, mgła, gołoledź, burza, zmrok
const wts = (
  rain: number, snow: number, cold: number, heat: number, wind: number,
  fog: number, ice: number, storm: number, dark: number,
): HazardVector => ({ rain, snow, cold, heat, wind, fog, ice, storm, dark });

const STORM: Veto = { when: (m) => m.peak.storm >= 1, reason: "burza" };

export const MODE_PROFILES: Record<TransportMode, ModeProfile> = {
  pieszo: {
    exposure: 1, vulnerability: 0.6,
    weights: wts(40, 25, 35, 25, 12, 8, 22, 60, 6),
    vetoes: [{ when: (m) => m.maxGust >= 90, reason: "huraganowy wiatr" }],
  },
  rower: {
    exposure: 1, vulnerability: 1,
    weights: wts(50, 55, 38, 22, 30, 20, 65, 75, 14),
    vetoes: [
      { when: (m) => m.peak.ice >= 0.7, reason: "gołoledź / śliska nawierzchnia" },
      { when: (m) => m.maxGust >= 60, reason: "porywy wiatru ≥ 60 km/h" },
      { when: (m) => m.peak.snow >= 0.6, reason: "intensywne opady śniegu" },
      { when: (m) => m.minApparent <= -15, reason: "ekstremalny mróz" },
      STORM,
    ],
  },
  "hulajnoga elektryczna": {
    exposure: 1, vulnerability: 1,
    weights: wts(55, 65, 38, 15, 30, 20, 70, 75, 16),
    vetoes: [
      { when: (m) => m.peak.ice >= 0.6, reason: "gołoledź / śliska nawierzchnia" },
      { when: (m) => m.maxGust >= 55, reason: "porywy wiatru ≥ 55 km/h" },
      { when: (m) => m.maxRain >= 4, reason: "silny deszcz (elektronika, przyczepność małych kół)" },
      { when: (m) => m.peak.snow >= 0.5, reason: "opady śniegu" },
      { when: (m) => m.minTemp <= -10, reason: "mróz (spadek pojemności baterii)" },
      STORM,
    ],
  },
  motocykl: {
    exposure: 0.9, vulnerability: 0.8,
    weights: wts(45, 85, 30, 12, 38, 30, 85, 80, 10),
    vetoes: [
      { when: (m) => m.peak.ice >= 0.5, reason: "ryzyko gołoledzi" },
      { when: (m) => m.peak.snow >= 0.4, reason: "opady śniegu" },
      { when: (m) => m.maxGust >= 65, reason: "porywy wiatru ≥ 65 km/h" },
      { when: (m) => m.minVisibility < 400, reason: "gęsta mgła" },
      { when: (m) => m.maxRain >= 8, reason: "ulewa" },
      STORM,
    ],
  },
  "skuter lub motorower": {
    exposure: 0.9, vulnerability: 0.8,
    weights: wts(45, 85, 32, 10, 38, 28, 85, 80, 10),
    vetoes: [
      { when: (m) => m.peak.ice >= 0.5, reason: "ryzyko gołoledzi" },
      { when: (m) => m.peak.snow >= 0.4, reason: "opady śniegu" },
      { when: (m) => m.maxGust >= 60, reason: "porywy wiatru ≥ 60 km/h" },
      { when: (m) => m.minVisibility < 400, reason: "gęsta mgła" },
      { when: (m) => m.maxRain >= 8, reason: "ulewa" },
      STORM,
    ],
  },
  samochód: {
    exposure: 0.1, vulnerability: 0,
    weights: wts(5, 30, 2, 2, 8, 18, 35, 14, 0),
    vetoes: [],
  },
  taksówka: {
    exposure: 0.1, vulnerability: 0,
    // deszcz: dłuższe oczekiwanie na kurs i ceny dynamiczne
    weights: wts(7, 25, 2, 2, 6, 16, 30, 12, 0),
    vetoes: [],
  },
  "car-sharing": {
    exposure: 0.2, vulnerability: 0,
    // dojście do auta na zewnątrz
    weights: wts(8, 32, 4, 2, 8, 18, 35, 14, 0),
    vetoes: [],
  },
  autobus: {
    exposure: 0.3, vulnerability: 0,
    weights: wts(15, 38, 11, 4, 8, 14, 38, 22, 0),
    vetoes: [],
  },
  tramwaj: {
    exposure: 0.3, vulnerability: 0,
    weights: wts(14, 22, 11, 4, 12, 5, 28, 22, 0),
    vetoes: [],
  },
  metro: {
    exposure: 0.2, vulnerability: 0,
    weights: wts(6, 5, 4, 2, 0, 0, 5, 4, 0),
    vetoes: [],
  },
  pociąg: {
    exposure: 0.3, vulnerability: 0,
    weights: wts(12, 38, 8, 4, 22, 10, 28, 30, 0),
    vetoes: [],
  },
  prom: {
    exposure: 0.35, vulnerability: 0,
    weights: wts(16, 18, 12, 3, 70, 55, 22, 80, 0),
    vetoes: [
      { when: (m) => m.maxGust >= 70, reason: "wiatr ≥ 70 km/h – rejsy zwykle wstrzymywane" },
      { when: (m) => m.minVisibility < 300, reason: "gęsta mgła – rejsy zwykle wstrzymywane" },
    ],
  },
  samolot: {
    exposure: 0.2, vulnerability: 0,
    weights: wts(5, 28, 2, 2, 40, 50, 38, 75, 0),
    vetoes: [
      { when: (m) => m.peak.storm >= 1, reason: "burza – wysokie ryzyko odwołania lotu" },
      { when: (m) => m.maxGust >= 90, reason: "porywy wiatru ≥ 90 km/h" },
    ],
  },
};

// ───────────────────────────── 4. Wnioskowanie ─────────────────────────────

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

function assessMode(mode: TransportMode, m: WindowMetrics): ModeAssessment {
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

// ───────────────────────────── API główne ─────────────────────────────

const WMO_PL: Record<number, string> = {
  0: "bezchmurnie", 1: "przeważnie bezchmurnie", 2: "częściowe zachmurzenie", 3: "pochmurno",
  45: "mgła", 48: "mgła osadzająca szron",
  51: "lekka mżawka", 53: "umiarkowana mżawka", 55: "gęsta mżawka",
  56: "marznąca mżawka", 57: "silna marznąca mżawka",
  61: "słaby deszcz", 63: "umiarkowany deszcz", 65: "silny deszcz",
  66: "marznący deszcz", 67: "silny marznący deszcz",
  71: "słabe opady śniegu", 73: "umiarkowane opady śniegu", 75: "intensywne opady śniegu", 77: "ziarna śniegu",
  80: "przelotny deszcz", 81: "silny przelotny deszcz", 82: "gwałtowna ulewa",
  85: "przelotne opady śniegu", 86: "intensywne przelotne opady śniegu",
  95: "burza", 96: "burza z gradem", 99: "burza z silnym gradem",
};

export function suggestTransport(weather: OpenMeteoResponse, ctx: WeatherContext = {}): Recommendation {
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
