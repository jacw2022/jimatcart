import { motion } from "motion/react";
import { InteractiveBasket } from "./InteractiveBasket";

interface WelcomeStepProps {
  onStart: () => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

function ArrowIcon() {
  return (
    <svg
      className="welcome-step__cta-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 12h12m0 0-5-5m5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="welcome-step__assurance-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.2 8.2 6.4 11.4 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <section className="welcome-step" aria-labelledby="welcome-heading">
      <div className="welcome-step__copy">
        <motion.p
          className="welcome-step__eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          Smarter grocery trips
        </motion.p>
        <motion.h1
          id="welcome-heading"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease }}
        >
          Make every ringgit count.
        </motion.h1>
        <motion.p
          className="welcome-step__pitch"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease }}
        >
          See if a second stop saves you money — shops, prices, and trip costs
          in a few playful steps.
        </motion.p>
        <motion.div
          className="welcome-step__actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease }}
        >
          <button
            type="button"
            className="button button--primary button--welcome"
            onClick={onStart}
          >
            <span>Start comparing</span>
            <span className="welcome-step__cta-badge" aria-hidden="true">
              <ArrowIcon />
            </span>
          </button>
          <p className="welcome-step__assurance">
            <CheckIcon />
            <span>Clear totals. No hidden maths.</span>
          </p>
        </motion.div>
      </div>

      <motion.div
        className="welcome-step__visual"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.15, ease }}
      >
        <InteractiveBasket />
      </motion.div>
    </section>
  );
}
