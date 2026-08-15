import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "../../src/features/errors/AppErrorBoundary";
import { BASKET_STORAGE_KEY } from "../../src/storage/basketStorage";

function Boom(): never {
  throw new Error("render boom");
}

describe("AppErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("logs the crash and can clear the saved basket before reload", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
    localStorage.setItem(BASKET_STORAGE_KEY, '{"version":4}');

    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "JimatCart needs a fresh start" }),
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear saved basket and reload" }),
    );
    expect(localStorage.getItem(BASKET_STORAGE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });
});
