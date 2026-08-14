import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("JimatCart application shell", () => {
  it("introduces the product and its purpose", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Make every ringgit count." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("See if a second stop saves you money."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Interactive basket savings preview" }),
    ).not.toBeInTheDocument();
  });

  it("provides labelled basket and recommendation regions", () => {
    render(<App />);

    expect(
      screen.getByRole("region", { name: "Build your basket" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: "Your smartest shop" }),
    ).toBeInTheDocument();
  });

  it("states that prices are entered manually", () => {
    render(<App />);

    expect(
      screen.getByText(/uses prices you enter manually/i),
    ).toBeInTheDocument();
  });
});
