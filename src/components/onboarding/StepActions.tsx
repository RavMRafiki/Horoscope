"use client";

import "./StepActions.css";

export function StepActions({
  step,
  loading,
  isFormSubmittable,
  onPrevious,
  onNext,
  onSubmit,
}: {
  step: number;
  loading: boolean;
  isFormSubmittable: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isLastStep = step >= 2;
  const showPrevious = step > 0;

  return (
    <div className="step-actions">
      {showPrevious && (
        <button className="secondary" onClick={onPrevious}>
          Wstecz
        </button>
      )}
      {isLastStep ? (
        <button
          className="primary"
          onClick={onSubmit}
          disabled={!isFormSubmittable}
        >
          {loading ? "Tworzę ranking…" : "Odkryj swoją energię"}
        </button>
      ) : (
        <button className="primary" onClick={onNext}>
          Dalej
        </button>
      )}
    </div>
  );
}
