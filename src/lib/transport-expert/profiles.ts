import type { HazardVector, ModeProfile, TransportMode, Veto } from "./types";

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
