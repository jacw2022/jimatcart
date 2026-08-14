import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type ButtonState = "idle" | "loading" | "success";

interface StatefulButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  children: string;
  resetSignal?: unknown;
}

export function StatefulButton({
  children,
  className = "",
  disabled,
  onClick,
  resetSignal,
  ...props
}: StatefulButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const timers = useRef<number[]>([]);

  function clearTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  useEffect(() => {
    clearTimers();
    setState("idle");
  }, [resetSignal]);

  useEffect(() => clearTimers, []);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (state === "loading") {
      event.preventDefault();
      return;
    }

    setState("loading");
    onClick?.(event);

    clearTimers();
    timers.current.push(
      window.setTimeout(() => setState("success"), 550),
      window.setTimeout(() => setState("idle"), 1600),
    );
  }

  const accessibleLabel =
    state === "loading"
      ? "Comparing basket"
      : state === "success"
        ? "Basket compared"
        : children;

  return (
    <motion.button
      layout
      className={`button stateful-button ${className}`.trim()}
      aria-label={accessibleLabel}
      aria-busy={state === "loading"}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {state === "loading" && (
          <motion.svg
            className="stateful-button__loader"
            key="loader"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            initial={{ width: 0, scale: 0 }}
            animate={{ width: 20, scale: 1, rotate: 360 }}
            exit={{ width: 0, scale: 0 }}
            transition={{ rotate: { duration: 0.6, repeat: Infinity, ease: "linear" } }}
            aria-hidden="true"
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </motion.svg>
        )}
        {state === "success" && (
          <motion.svg
            className="stateful-button__check"
            key="check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ width: 0, scale: 0 }}
            animate={{ width: 20, scale: 1 }}
            exit={{ width: 0, scale: 0 }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12 2.2 2.2 4.8-5" />
          </motion.svg>
        )}
      </AnimatePresence>
      <motion.span layout>
        {state === "loading"
          ? "Comparing…"
          : state === "success"
            ? "Compared"
            : children}
      </motion.span>
    </motion.button>
  );
}
