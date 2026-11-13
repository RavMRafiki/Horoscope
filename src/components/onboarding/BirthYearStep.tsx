"use client";

import "./OnboardingSteps.css";
import "./BirthYearStep.css";

export function BirthYearStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1990"
        aria-label="Rok urodzenia"
        autoFocus
      />
    </div>
  );
}
