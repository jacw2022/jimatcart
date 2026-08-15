import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("JimatCart application shell", () => {
  it("introduces the product and its purpose on welcome", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Make every ringgit count." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/See if a second stop saves you money/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start comparing" }),
    ).toBeInTheDocument();
  });

  it("opens the shops step from welcome", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start comparing" }));
    expect(
      screen.getByRole("region", { name: "Where do you shop?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Basket comparison steps" }),
    ).toBeInTheDocument();
  });

  it("states that prices are entered manually", () => {
    render(<App />);

    expect(
      screen.getByText(/uses prices you enter manually/i),
    ).toBeInTheDocument();
  });
});
