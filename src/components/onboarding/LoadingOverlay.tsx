"use client";

import "./LoadingOverlay.css";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Czytam układ gwiazd nad Twoją trasą…",
  "Słucham szeptu planet i przystanków…",
  "Tkam kosmiczną aurę podróży…",
  "Odczytuję znaki ukryte w chmurach…",
  "Splatając losy ze środkami transportu…",
  "Wypatruję wróżby na horyzoncie…",
];

export function LoadingOverlay() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-orb" aria-hidden="true">
        ✦
      </div>
      <p className="loading-title">Gwiazdy kreślą Twój horoskop</p>
      <p className="loading-message" key={index}>
        {MESSAGES[index]}
      </p>
      <div className="loading-stars" aria-hidden="true">
        ☽ ⚝ ☾
      </div>
    </div>
  );
}
