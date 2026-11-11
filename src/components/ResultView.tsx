"use client";

import type { WeatherResult } from "@/types/horoscope";
import { TarotCard } from "./TarotCard";

export function ResultView({
  result,
  onReset,
}: {
  result: WeatherResult;
  onReset: () => void;
}) {
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
          <button className="arcana-reset" onClick={onReset}>
            Zmień wybór i sprawdź ponownie
          </button>
        </div>
      </header>

      <section className="arcana-grid" aria-live="polite">
        {result.horoscope.ranking.map((item) => (
          <TarotCard key={item.transport} item={item} />
        ))}
      </section>

      <p className="arcana-disclaimer">
        To fikcyjna, rozrywkowa interpretacja — nie jest poradą ani prognozą.
      </p>
    </main>
  );
}
