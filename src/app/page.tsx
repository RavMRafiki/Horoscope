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
  horoscope: {
    ranking: Array<{ transport: string; rank: number; happiness: string; positiveEnergy: string; negativeEnergy: string }>;
  };
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
      if (!ipResponse.ok) throw new Error("Nie udało się przygotować rankingu. Spróbuj ponownie.");
      const { ip } = (await ipResponse.json()) as { ip?: string };
      if (!ip) throw new Error("Nie udało się przygotować rankingu. Spróbuj ponownie.");

      const response = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, transports, zodiacSign, birthYear: Number(birthYear) })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Nie udało się przygotować rankingu. Spróbuj ponownie.");
      setResult(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Wystąpił nieznany błąd.");
    } finally {
      setLoading(false);
    }
  }

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
        <p className="eyebrow">ENERGIA PODRÓŻY</p>
        {!result && <p className="intro">Przejdziemy przez trzy krótkie kroki, aby stworzyć rozrywkowy ranking energii podróży.</p>}
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
              {onboardingStep < 2 ? <button className="primary" onClick={nextStep}>Dalej</button> : <button className="primary" onClick={loadWeather} disabled={loading || !onboardingComplete}>{loading ? "Tworzę ranking…" : "Odkryj swoją energię"}</button>}
            </div>
          </section>
        )}
        {result && <button className="primary" onClick={() => { setResult(null); setOnboardingStep(0); }} disabled={loading}>Zmień wybór i sprawdź ponownie</button>}
      </section>

      {error && <div className="error">{error}</div>}

      {result && (
        <section className="weather" aria-live="polite">
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
        </section>
      )}
    </main>
  );
}
