"use client";

import "./ResultView.css";
import type { HoroscopeResult } from "@/lib/domain/horoscope";
import { TarotCard } from "./TarotCard";

export function ResultView({
  result,
  onReset,
}: {
  result: HoroscopeResult;
  onReset: () => void;
}) {
  return (
    <main className="arcana-shell">
      <header className="arcana-header">
        <div className="arcana-badge">
          <span>✦</span> Horoskop Podróży <span>✦</span>
        </div>
        <h1 className="arcana-title">AstroCommute</h1>
        <p className="arcana-subtitle">
          Karty energii Twoich środków transportu — od najlepszej do najgorszej.
          Najedź na kartę, aby poczuć jej blask.
        </p>
        <div className="arcana-actions">
          <button type="button" className="arcana-reset" onClick={onReset}>
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
        Wyniki AstroCommute to zabawa oparta na motywach astrologicznych, a nie
        algorytm nawigacyjny. Choć gwiazdy mogą sugerować spacer, jeśli ucieka
        Ci pociąg albo leje deszcz – wybierz to, co podpowiada logika i
        bezpieczeństwo. Twórcy aplikacji nie odpowiadają za spóźnienia,
        odjechane autobusy ani kaprysy losu!
      </p>
    </main>
  );
}
