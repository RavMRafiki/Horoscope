"use client";

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
import { transportOptions } from "@/lib/horoscope";

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

export function TransportStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (transport: string) => void;
}) {
  return (
    <div className="step">
      <h2>Jak rozważasz podróżować?</h2>
      <p className="step-hint">Możesz wybrać kilka opcji.</p>
      <div className="icon-grid transport-icons">
        {transportOptions.map((transport) => {
          const Icon = TRANSPORT_ICONS[transport];
          const isSelected = selected.includes(transport);
          return (
            <button
              className={`icon-choice ${isSelected ? "selected" : ""}`}
              key={transport}
              onClick={() => onToggle(transport)}
              aria-pressed={isSelected}
            >
              <span className="choice-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>{transport}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
