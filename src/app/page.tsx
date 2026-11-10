"use client";

import { useState } from "react";
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

function displayValue(key: string, value: unknown): string {
  if (typeof value !== "number" && typeof value !== "string") return "—";
  const suffix = key.includes("temperature") ? "°C" : key.includes("humidity") || key.includes("probability") ? "%" : "";
  return `${typeof value === "number" ? Math.round(value * 10) / 10 : value}${suffix}`;
}

export default function Home() {
  const [transports, setTransports] = useState<string[]>([]);
  const [zodiacSign, setZodiacSign] = useState("");
  const [birthYear, setBirthYear] = useState("");
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
      if (!response.ok) throw new Error(body.error ?? "Nie udało się pobrać pogody.");
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Wystąpił nieznany błąd.");
    } finally {
      setLoading(false);
    }
  }

  const current = result?.weather.current;
  const daily = result?.weather.daily;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">DZISIAJ · POLSKA</p>
        <h1>Wybierz swoją trasę.</h1>
        <p className="intro">Zaznacz transport, podaj znak zodiaku i rok urodzenia. Pogoda z Twojej okolicy pomoże stworzyć rozrywkowy ranking energii podróży.</p>
        <fieldset className="form-section">
          <legend>Jak rozważasz podróżować?</legend>
          <div className="transport-grid">
            {transportOptions.map((transport) => (
              <label className="check" key={transport}>
                <input type="checkbox" checked={transports.includes(transport)} onChange={(event) => setTransports((current) => event.target.checked ? [...current, transport] : current.filter((item) => item !== transport))} />
                <span>{transport}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-row">
          <label>Znak zodiaku
            <select value={zodiacSign} onChange={(event) => setZodiacSign(event.target.value)}>
              <option value="">Wybierz znak</option>
              {zodiacSigns.map((sign) => <option key={sign}>{sign}</option>)}
            </select>
          </label>
          <label>Rok urodzenia
            <input type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={(event) => setBirthYear(event.target.value)} placeholder="np. 1990" />
          </label>
        </div>
        <button className="primary" onClick={loadWeather} disabled={loading}>
          {loading ? "Sprawdzam lokalizację…" : result ? "Odśwież pogodę" : "Pokaż dzisiejszą pogodę"}
        </button>
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
