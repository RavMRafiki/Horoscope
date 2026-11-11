"use client";

import { useState, type MouseEvent } from "react";
import type { IconType } from "react-icons";
import {
  FaBicycle,
  FaBus,
  FaCar,
  FaFerry,
  FaHandshake,
  FaMotorcycle,
  FaPersonWalking,
  FaPlane,
  FaTaxi,
  FaTrain,
  FaTrainSubway,
  FaTrainTram,
} from "react-icons/fa6";
import {
  GiAries,
  GiAquarius,
  GiCancer,
  GiCapricorn,
  GiGemini,
  GiLeo,
  GiLibra,
  GiPisces,
  GiSagittarius,
  GiScorpio,
  GiTaurus,
  GiVirgo,
} from "react-icons/gi";
import { transportOptions, zodiacSigns } from "@/lib/horoscope";

type WeatherResult = {
  horoscope: {
    ranking: Array<{
      transport: string;
      rank: number;
      archetype: string;
      element: string;
      patronPlanet: string;
      aura: string;
      warning: string;
      cosmicCompatibility: string;
    }>;
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
  samolot: FaPlane,
};

const zodiacIcons: Record<string, IconType> = {
  Baran: GiAries,
  Byk: GiTaurus,
  Bliźnięta: GiGemini,
  Rak: GiCancer,
  Lew: GiLeo,
  Panna: GiVirgo,
  Waga: GiLibra,
  Skorpion: GiScorpio,
  Strzelec: GiSagittarius,
  Koziorożec: GiCapricorn,
  Wodnik: GiAquarius,
  Ryby: GiPisces,
};

const transportHeroImages: Record<string, string> = {
  pieszo: "/images/transport/pieszo.png",
  rower: "/images/transport/rower.png",
  "hulajnoga elektryczna": "/images/transport/hulajnoga%20elektryczna.png",
  motocykl: "/images/transport/motocykl.png",
  "skuter lub motorower": "/images/transport/kuter%20lub%20motorower.png",
  samochód: "/images/transport/samoch%C3%B3d.png",
  taksówka: "/images/transport/taks%C3%B3wka.png",
  "car-sharing": "/images/transport/car-sharing.png",
  autobus: "/images/transport/autobus.png",
  tramwaj: "/images/transport/tramwaj.png",
  metro: "/images/transport/metro.png",
  pociąg: "/images/transport/poci%C4%85g.png",
  prom: "/images/transport/prom.png",
  samolot: "/images/transport/samolot.png",
};

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [value, sym] of map) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out || String(num);
}

function handleCardMove(e: MouseEvent<HTMLElement>) {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -12;
  const rotateY = ((x - centerX) / centerX) * 12;
  card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px) scale(1.02)`;
  card.style.setProperty("--mouse-x", `${x}px`);
  card.style.setProperty("--mouse-y", `${y}px`);
}

function handleCardLeave(e: MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = "rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)";
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
      let ip: string | undefined;
      try {
        const ipResponse = await fetch("https://api64.ipify.org?format=json", {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (ipResponse.ok) {
          ({ ip } = (await ipResponse.json()) as { ip?: string });
        }
      } catch {
        // Fallback to server-side IP detection when browser lookup fails.
      }

      const response = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(ip ? { ip } : {}),
          transports,
          zodiacSign,
          birthYear: Number(birthYear),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error ?? "Nie udało się przygotować rankingu. Spróbuj ponownie.",
        );
      setResult(body);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Wystąpił nieznany błąd.",
      );
    } finally {
      setLoading(false);
    }
  }

  const onboardingComplete =
    transports.length > 0 && Boolean(zodiacSign) && Boolean(birthYear);

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

  if (result) {
    return (
      <main className="arcana-shell">
        <header className="arcana-header">
          <div className="arcana-badge">
            <span>✦</span> Horoskop Podróży <span>✦</span>
          </div>
          <h1 className="arcana-title">URBAN ARCANA</h1>
          <p className="arcana-subtitle">
            Karty energii Twoich środków transportu — od najlepszej do najgorszej.
            Najedź lub dotknij kartę, aby poczuć jej blask.
          </p>
          <div className="arcana-actions">
            <button
              className="arcana-reset"
              onClick={() => {
                setResult(null);
                setOnboardingStep(0);
              }}
              disabled={loading}
            >
              Zmień wybór i sprawdź ponownie
            </button>
          </div>
        </header>

        <section className="arcana-grid" aria-live="polite">
          {result.horoscope.ranking.map((item) => {
            const Icon = transportIcons[item.transport] ?? FaPersonWalking;
            return (
              <div className="card-perspective" key={item.transport}>
                <article
                  className="tarot-card"
                  onMouseMove={handleCardMove}
                  onMouseLeave={handleCardLeave}
                >
                  <div className="tarot-corner tarot-corner-tl" />
                  <div className="tarot-corner tarot-corner-tr" />
                  <div className="tarot-corner tarot-corner-bl" />
                  <div className="tarot-corner tarot-corner-br" />
                  <div className="foil-overlay" />

                  <div className="tarot-inner">
                    <div className="tarot-top">
                      <div className="tarot-arcana-label">✦ ARCANA {toRoman(item.rank)}</div>
                      <div className="tarot-rank-badge">{item.rank}</div>
                      <div className="tarot-stars">☽ ⚝ ☾</div>
                    </div>

                    <div
                      className="tarot-hero"
                      style={
                        {
                          "--hero-image": `url("${transportHeroImages[item.transport] ?? transportHeroImages.samochód}")`,
                        } as React.CSSProperties
                      }
                    >
                      <div className="tarot-icon-wrap">
                        <Icon aria-hidden="true" />
                      </div>
                      <h2 className="tarot-transport">{item.transport}</h2>
                      <p className="tarot-archetype">{item.archetype}</p>
                    </div>

                    <div className="tarot-badges">
                      <div className="tarot-badge-row">
                        <span className="tarot-badge-label">Żywioł</span>
                        <span className="tarot-badge-value">{item.element}</span>
                      </div>
                      <div className="tarot-badge-row">
                        <span className="tarot-badge-label">Patron</span>
                        <span className="tarot-badge-value">{item.patronPlanet}</span>
                      </div>
                    </div>

                    <div className="tarot-fields">
                      <div>
                        <span className="tarot-field-label">Aura</span>
                        <p className="tarot-field-text">{item.aura}</p>
                      </div>
                      <div className="tarot-warning">
                        <span className="tarot-field-label">⚠ Przestroga</span>
                        <p className="tarot-field-text">{item.warning}</p>
                      </div>
                      <div className="tarot-compat">
                        <span className="tarot-field-label">Kompatybilność kosmiczna</span>
                        <p className="tarot-field-text">{item.cosmicCompatibility}</p>
                      </div>
                    </div>

                    <div className="tarot-footer">✦ URBAN ARCANA • NO. {String(item.rank).padStart(2, "0")} ✦</div>
                  </div>
                </article>
              </div>
            );
          })}
        </section>

        <p className="arcana-disclaimer">
          To fikcyjna, rozrywkowa interpretacja — nie jest poradą ani prognozą.
        </p>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">✦ Energia Podróży ✦</p>
        <h1 className="arcana-page-title">URBAN ARCANA</h1>
        <p className="intro">
          Przejdziemy przez trzy krótkie kroki, aby stworzyć rozrywkowy ranking
          energii podróży.
        </p>
        <section className="onboarding" aria-label="Konfiguracja horoskopu">
          <div className="progress">
            <span>KROK {onboardingStep + 1} Z 3</span>
            <i style={{ width: `${((onboardingStep + 1) / 3) * 100}%` }} />
          </div>
          {onboardingStep === 0 && (
            <div className="step">
              <h2>Jak rozważasz podróżować?</h2>
              <p className="step-hint">Możesz wybrać kilka opcji.</p>
              <div className="icon-grid transport-icons">
                {transportOptions.map((transport) =>
                  (() => {
                    const Icon = transportIcons[transport];
                    return (
                      <button
                        className={`icon-choice ${transports.includes(transport) ? "selected" : ""}`}
                        key={transport}
                        onClick={() =>
                          setTransports((current) =>
                            current.includes(transport)
                              ? current.filter((item) => item !== transport)
                              : [...current, transport],
                          )
                        }
                        aria-pressed={transports.includes(transport)}
                      >
                        <span className="choice-icon">
                          <Icon aria-hidden="true" />
                        </span>
                        <span>{transport}</span>
                      </button>
                    );
                  })(),
                )}
              </div>
            </div>
          )}
          {onboardingStep === 1 && (
            <div className="step">
              <h2>Jaki jest Twój znak?</h2>
              <p className="step-hint">Wybierz znak zodiaku.</p>
              <div className="icon-grid zodiac-icons">
                {zodiacSigns.map((sign) =>
                  (() => {
                    const Icon = zodiacIcons[sign];
                    return (
                      <button
                        className={`icon-choice ${zodiacSign === sign ? "selected" : ""}`}
                        key={sign}
                        onClick={() => setZodiacSign(sign)}
                        aria-pressed={zodiacSign === sign}
                      >
                        <span className="choice-icon zodiac">
                          <Icon aria-hidden="true" />
                        </span>
                        <span>{sign}</span>
                      </button>
                    );
                  })(),
                )}
              </div>
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="step year-step">
              <h2>W którym roku się urodziłeś?</h2>
              <p className="step-hint">
                Ta informacja pomaga nadać horoskopowi osobisty charakter.
              </p>
              <input
                className="year-input"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={birthYear}
                onChange={(event) => setBirthYear(event.target.value)}
                placeholder="1990"
                autoFocus
              />
            </div>
          )}
          <div className="step-actions">
            {onboardingStep > 0 && (
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  setOnboardingStep((step) => step - 1);
                }}
              >
                Wstecz
              </button>
            )}
            {onboardingStep < 2 ? (
              <button className="primary" onClick={nextStep}>
                Dalej
              </button>
            ) : (
              <button
                className="primary"
                onClick={loadWeather}
                disabled={loading || !onboardingComplete}
              >
                {loading ? "Tworzę ranking…" : "Odkryj swoją energię"}
              </button>
            )}
          </div>
        </section>
      </section>

      {error && <div className="error">{error}</div>}
    </main>
  );
}
