import { motion } from "motion/react";

interface WelcomeStepProps {
  onStart: () => void;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <section className="welcome-step" aria-labelledby="welcome-heading">
      <motion.div
        className="welcome-step__mark"
        aria-hidden="true"
        initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.55, ease }}
      >
        JC
      </motion.div>
      <motion.p
        className="welcome-step__brand"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease }}
      >
        JimatCart
      </motion.p>
      <motion.h1
        id="welcome-heading"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease }}
      >
        Make every ringgit count.
      </motion.h1>
      <motion.p
        className="welcome-step__pitch"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.26, ease }}
      >
        See if a second stop saves you money — shops, prices, and trip costs in
        a few playful steps.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.36, ease }}
      >
        <button
          type="button"
          className="button button--primary button--welcome"
          onClick={onStart}
        >
          Start comparing
        </button>
      </motion.div>
    </section>
  );
}
