import type { Hazard } from "./types";

export const HOUR_MS = 3_600_000;
export const HAZARDS: readonly Hazard[] = [
  "rain",
  "snow",
  "cold",
  "heat",
  "wind",
  "fog",
  "ice",
  "storm",
  "dark",
];

export const THUNDER_CODES = new Set([95, 96, 99]);
export const FOG_CODES = new Set([45, 48]);
export const FREEZING_CODES = new Set([56, 57, 66, 67]);

/** Minimalne nasilenie deszczu wynikające z kodu WMO (gdy liczby są zaniżone). */
export const RAIN_CODE_FLOOR: Record<number, number> = {
  51: 0.1, 53: 0.2, 55: 0.35, 56: 0.25, 57: 0.4, 61: 0.25, 63: 0.5, 65: 0.85,
  66: 0.4, 67: 0.7, 80: 0.3, 81: 0.6, 82: 0.95, 95: 0.7, 96: 0.8, 99: 0.9,
};

export const SNOW_CODE_FLOOR: Record<number, number> = {
  71: 0.25, 73: 0.5, 75: 0.85, 77: 0.3, 85: 0.4, 86: 0.8,
};

export const WMO_PL: Record<number, string> = {
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
