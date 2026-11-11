"use client";

import type { CSSProperties } from "react";
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
import type { HoroscopeItem } from "@/types/horoscope";
import { handleCardLeave, handleCardMove, toRoman } from "@/lib/utils";

const TRANSPORT_ICONS: Record<string, IconType> = {
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

const TRANSPORT_HERO_IMAGES: Record<string, string> = {
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

export function TarotCard({ item }: { item: HoroscopeItem }) {
  const Icon = TRANSPORT_ICONS[item.transport] ?? FaPersonWalking;
  const heroImage =
    TRANSPORT_HERO_IMAGES[item.transport] ?? TRANSPORT_HERO_IMAGES.samochód;
  const heroStyle = {
    "--hero-image": `url("${heroImage}")`,
  } as CSSProperties;

  return (
    <div className="card-perspective">
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

          <div className="tarot-hero" style={heroStyle}>
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

          <div className="tarot-footer">
            ✦ URBAN ARCANA • NO. {String(item.rank).padStart(2, "0")} ✦
          </div>
        </div>
      </article>
    </div>
  );
}
