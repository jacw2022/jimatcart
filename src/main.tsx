import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { App } from "./App";
import { AppErrorBoundary } from "./features/errors/AppErrorBoundary";
import "./fonts.css";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("JimatCart could not find its application root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);
