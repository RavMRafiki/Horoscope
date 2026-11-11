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

export interface WeatherSample {
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

export interface WindowMetrics {
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

export interface Veto {
  when: (m: WindowMetrics) => boolean;
  reason: string;
}

export interface ModeProfile {
  /** 0–1: jak bardzo użytkownik jest wystawiony na pogodę (jazda na otwartym powietrzu, przystanki, dojście). */
  exposure: number;
  /** 0–1: podatność na bycie niewidocznym / poślizg (pieszy, rowerzysta, motocyklista). */
  vulnerability: number;
  /** Punkty karne przy nasileniu zjawiska = 1. */
  weights: HazardVector;
  /** Reguły wykluczające – przy spełnieniu środek jest odradzany jako niebezpieczny/niewykonalny. */
  vetoes: Veto[];
}
