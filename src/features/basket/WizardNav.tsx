import { StatefulButton } from "../../components/ui/StatefulButton";

interface WizardNavProps {
  showBack: boolean;
  onBack: () => void;
  primaryLabel: string;
  primaryType?: "button" | "submit";
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  useCompareButton?: boolean;
  compareResetSignal?: unknown;
  hint?: string;
}

export function WizardNav({
  showBack,
  onBack,
  primaryLabel,
  primaryType = "button",
  onPrimary,
  primaryDisabled = false,
  useCompareButton = false,
  compareResetSignal,
  hint,
}: WizardNavProps) {
  return (
    <div className="wizard-nav">
      {hint && <p className="wizard-nav__hint">{hint}</p>}
      <div className="wizard-nav__actions">
        {showBack ? (
          <button
            type="button"
            className="button button--secondary"
            onClick={onBack}
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {useCompareButton ? (
          <StatefulButton
            className="button--primary button--compare"
            resetSignal={compareResetSignal}
            type="submit"
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </StatefulButton>
        ) : (
          <button
            type={primaryType}
            className="button button--primary"
            onClick={onPrimary}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
