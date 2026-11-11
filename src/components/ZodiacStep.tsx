"use client";

import type { IconType } from "react-icons";
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
import { zodiacSigns } from "@/lib/horoscope";

const ZODIAC_ICONS: Record<string, IconType> = {
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

export function ZodiacStep({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (sign: string) => void;
}) {
  return (
    <div className="step">
      <h2>Jaki jest twój gwiezdny patron?</h2>
      <p className="step-hint">Wybierz znak zodiaku.</p>
      <div className="icon-grid zodiac-icons">
        {zodiacSigns.map((sign) => {
          const Icon = ZODIAC_ICONS[sign];
          const isSelected = selected === sign;
          return (
            <button
              className={`icon-choice ${isSelected ? "selected" : ""}`}
              key={sign}
              onClick={() => onSelect(sign)}
              aria-pressed={isSelected}
            >
              <span className="choice-icon zodiac">
                <Icon aria-hidden="true" />
              </span>
              <span>{sign}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
