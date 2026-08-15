import { WIZARD_STEPS, type WizardStepIndex } from "./wizardSteps";

interface WizardProgressProps {
  current: WizardStepIndex;
  onJump?: (step: WizardStepIndex) => void;
  maxReachable: WizardStepIndex;
}

function StepGlyph({
  index,
  complete,
  current,
}: {
  index: number;
  complete: boolean;
  current: boolean;
}) {
  if (complete) {
    return (
      <span className="wizard-progress__index wizard-progress__index--check" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
          <path
            d="M3.5 8.2 6.4 11l6.1-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={[
        "wizard-progress__index",
        current ? "wizard-progress__index--current" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {index + 1}
    </span>
  );
}

export function WizardProgress({
  current,
  onJump,
  maxReachable,
}: WizardProgressProps) {
  const total = WIZARD_STEPS.length;
  const currentLabel = WIZARD_STEPS[current]?.label ?? "Step";

  return (
    <nav className="wizard-progress" aria-label="Basket comparison steps">
      <p className="wizard-progress__status">
        Step {current + 1} of {total} · {currentLabel}
      </p>
      <ol className="wizard-progress__list">
        {WIZARD_STEPS.map((step, index) => {
          const stepIndex = index as WizardStepIndex;
          const isCurrent = stepIndex === current;
          const isComplete = stepIndex < current;
          const isFuture = stepIndex > current;
          const canJump = stepIndex <= maxReachable && stepIndex !== current;
          const label = isComplete ? `${step.label}, completed` : step.label;
          return (
            <li
              key={step.id}
              className={[
                "wizard-progress__item",
                isCurrent ? "wizard-progress__item--current" : "",
                isComplete ? "wizard-progress__item--complete" : "",
                isFuture ? "wizard-progress__item--future" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isCurrent ? "step" : undefined}
            >
              {canJump && onJump ? (
                <button
                  type="button"
                  className="wizard-progress__button"
                  onClick={() => onJump(stepIndex)}
                  aria-label={label}
                >
                  <StepGlyph index={index} complete={isComplete} current={isCurrent} />
                  <span className="wizard-progress__label">{step.label}</span>
                </button>
              ) : (
                <span className="wizard-progress__static">
                  <StepGlyph index={index} complete={isComplete} current={isCurrent} />
                  <span className="wizard-progress__label">{step.label}</span>
                  {isCurrent && (
                    <span className="visually-hidden">
                      , current step, {index + 1} of {total}
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
