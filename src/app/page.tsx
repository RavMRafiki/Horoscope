"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import {
  FaBicycle, FaBus, FaCar, FaFerry, FaHandshake, FaMotorcycle,
  FaPersonWalking, FaPlane, FaTaxi, FaTrain, FaTrainSubway, FaTrainTram
} from "react-icons/fa6";
import {
  GiAries, GiAquarius, GiCancer, GiCapricorn, GiGemini, GiLeo,
  GiLibra, GiPisces, GiSagittarius, GiScorpio, GiTaurus, GiVirgo
} from "react-icons/gi";
import { transportOptions, zodiacSigns } from "@/lib/horoscope";

type WeatherResult = {
  location: { city: string; distanceKm: number; coordinates: { latitude: number; longitude: number } };
  weather: {
    date: string;
    timezone: string;
    current: Record<string, unknown>;
    hourly: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[] };
    daily: Record<string, unknown>;
  };
  horoscope: {
    ranking: Array<{ transport: string; rank: number; happiness: string; positiveEnergy: string; negativeEnergy: string }>;
  };
};

const labels: Record<string, string> = {
  temperature_2m: "Temperatura",
  apparent_temperature: "Odczuwalna",
  relative_humidity_2m: "Wilgotność",
  wind_speed_10m: "Wiatr",
  surface_pressure: "Ciśnienie",
  precipitation: "Opady",
  precipitation_probability_max: "Szansa opadów",
  temperature_2m_max: "Najwyższa",
  temperature_2m_min: "Najniższa",
  sunrise: "Wschód słońca",
  sunset: "Zachód słońca",
  uv_index_max: "Maks. UV"
};

const transportIcons: Record<string, IconType> = {
  pieszo: FaPersonWalking,
  rower: FaBicycle,
  "hulajnoga elektryczna": FaMotorcycle,
  motocykl: FaMotorcycle,
  "skuter lub motorower": FaMotorcycle,
  samochód: FaCar,
  taksówka: FaTaxi,
  "car-sharing": FaHandshake,
  autobus: FaBus,
  tramwaj: FaTrainTram,
  metro: FaTrainSubway,
  pociąg: FaTrain,
  prom: FaFerry,
  samolot: FaPlane
};

const zodiacIcons: Record<string, IconType> = {
  Baran: GiAries, Byk: GiTaurus, Bliźnięta: GiGemini, Rak: GiCancer, Lew: GiLeo, Panna: GiVirgo,
  Waga: GiLibra, Skorpion: GiScorpio, Strzelec: GiSagittarius, Koziorożec: GiCapricorn,
  Wodnik: GiAquarius, Ryby: GiPisces
};

function displayValue(key: string, value: unknown): string {
  if (typeof value !== "number" && typeof value !== "string") return "—";
  const suffix = key.includes("temperature") ? "°C" : key.includes("humidity") || key.includes("probability") ? "%" : "";
  return `${typeof value === "number" ? Math.round(value * 10) / 10 : value}${suffix}`;
}

export default function Home() {
  const [transports, setTransports] = useState<string[]>([]);
  const [zodiacSign, setZodiacSign] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadWeather() {
    if (transports.length === 0 || !zodiacSign || !birthYear) {
      setError("Wybierz transport, znak zodiaku i rok urodzenia.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ipResponse = await fetch("https://api64.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000),
        cache: "no-store"
      });
      if (!ipResponse.ok) throw new Error("Nie udało się odczytać publicznego adresu IP.");
      const { ip } = (await ipResponse.json()) as { ip?: string };
      if (!ip) throw new Error("Usługa publicznego adresu IP nie zwróciła adresu.");

      const response = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, transports, zodiacSign, birthYear: Number(birthYear) })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Nie udało się pobrać pogody. Spróbuj ponownie.");
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Wystąpił nieznany błąd.");
    } finally {
      setLoading(false);
    }
  }

  const current = result?.weather.current;
  const daily = result?.weather.daily;
  const onboardingComplete = transports.length > 0 && Boolean(zodiacSign) && Boolean(birthYear);

  function nextStep() {
    setError("");
    if (onboardingStep === 0 && transports.length === 0) {
      setError("Wybierz przynajmniej jeden środek transportu.");
      return;
    }
    if (onboardingStep === 1 && !zodiacSign) {
      setError("Wybierz swój znak zodiaku.");
      return;
    }
    setOnboardingStep((step) => Math.min(step + 1, 2));
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">DZISIAJ · POLSKA</p>
        {!result && <p className="intro">Przejdziemy przez trzy krótkie kroki. Pogoda z Twojej okolicy pomoże stworzyć rozrywkowy ranking energii podróży.</p>}
        {!result && (
          <section className="onboarding" aria-label="Konfiguracja horoskopu">
            <div className="progress"><span>KROK {onboardingStep + 1} Z 3</span><i style={{ width: `${((onboardingStep + 1) / 3) * 100}%` }} /></div>
            {onboardingStep === 0 && (
              <div className="step">
                <h2>Jak rozważasz podróżować?</h2>
                <p className="step-hint">Możesz wybrać kilka opcji.</p>
                <div className="icon-grid transport-icons">
                  {transportOptions.map((transport) => (
                    (() => {
                      const Icon = transportIcons[transport];
                      return (
                        <button className={`icon-choice ${transports.includes(transport) ? "selected" : ""}`} key={transport} onClick={() => setTransports((current) => current.includes(transport) ? current.filter((item) => item !== transport) : [...current, transport])} aria-pressed={transports.includes(transport)}>
                          <span className="choice-icon"><Icon aria-hidden="true" /></span><span>{transport}</span>
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}
            {onboardingStep === 1 && (
              <div className="step">
                <h2>Jaki jest Twój znak?</h2>
                <p className="step-hint">Wybierz znak zodiaku.</p>
                <div className="icon-grid zodiac-icons">
                  {zodiacSigns.map((sign) => (
                    (() => {
                      const Icon = zodiacIcons[sign];
                      return (
                        <button className={`icon-choice ${zodiacSign === sign ? "selected" : ""}`} key={sign} onClick={() => setZodiacSign(sign)} aria-pressed={zodiacSign === sign}>
                          <span className="choice-icon zodiac"><Icon aria-hidden="true" /></span><span>{sign}</span>
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="step year-step">
                <h2>W którym roku się urodziłeś?</h2>
                <p className="step-hint">Ta informacja pomaga nadać horoskopowi osobisty charakter.</p>
                <input className="year-input" type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="1990" autoFocus />
              </div>
            )}
            <div className="step-actions">
              {onboardingStep > 0 && <button className="secondary" onClick={() => { setError(""); setOnboardingStep((step) => step - 1); }}>Wstecz</button>}
              {onboardingStep < 2 ? <button className="primary" onClick={nextStep}>Dalej</button> : <button className="primary" onClick={loadWeather} disabled={loading || !onboardingComplete}>{loading ? "Sprawdzam lokalizację…" : "Odkryj swoją energię"}</button>}
            </div>
          </section>
        )}
        {result && <button className="primary" onClick={() => { setResult(null); setOnboardingStep(0); }} disabled={loading}>Zmień wybór i sprawdź ponownie</button>}
        <p className="privacy">Lokalizacja jest przybliżona. Nie zapisujemy Twojego adresu IP, tylko jego anonimowy skrót.</p>
      </section>

      {error && <div className="error">{error}</div>}

      {result && current && daily && (
        <section className="weather" aria-live="polite">
          <div className="location">
            <div>
              <p className="eyebrow">NAJBLIŻSZE MIASTO</p>
              <h2>{result.location.city}</h2>
              <p>{result.weather.date} · {result.weather.timezone}</p>
            </div>
            <span className="distance">~{result.location.distanceKm} km</span>
          </div>
          <div className="current-card">
            <p className="eyebrow">TERAZ</p>
            <strong>{displayValue("temperature_2m", current.temperature_2m)}</strong>
            <span>odczuwalna {displayValue("apparent_temperature", current.apparent_temperature)}</span>
          </div>
          <div className="metrics">
            {Object.entries(current).filter(([key]) => key !== "temperature_2m" && key !== "apparent_temperature").map(([key, value]) => (
              <div className="metric" key={key}><span>{labels[key] ?? key.replaceAll("_", " ")}</span><b>{displayValue(key, value)}</b></div>
            ))}
          </div>
          <div className="summary">
            <h3>Dzisiejsze podsumowanie</h3>
            {Object.entries(daily).filter(([key]) => key !== "time").map(([key, value]) => (
              <div className="summary-row" key={key}><span>{labels[key] ?? key.replaceAll("_", " ")}</span><b>{Array.isArray(value) ? displayValue(key, value[0]) : displayValue(key, value)}</b></div>
            ))}
          </div>
          <div className="summary horoscope">
            <p className="eyebrow">HOROSKOP PODRÓŻY</p>
            <h3>Od najlepszej energii do najgorszej</h3>
            {result.horoscope.ranking.map((item) => (
              <article className="ranking" key={item.transport}>
                <div className="rank">{item.rank}</div>
                <div>
                  <h4>{item.transport}</h4>
                  <p><b>Szczęście:</b> {item.happiness}</p>
                  <p><b>Pozytywna energia:</b> {item.positiveEnergy}</p>
                  <p><b>Negatywna energia:</b> {item.negativeEnergy}</p>
                </div>
              </article>
            ))}
            <p className="source">To fikcyjna, rozrywkowa interpretacja — nie jest poradą ani prognozą.</p>
          </div>
          <p className="source">Dane pogodowe: Open-Meteo · współrzędne są orientacyjne</p>
        </section>
      )}
    </main>
  );
}
