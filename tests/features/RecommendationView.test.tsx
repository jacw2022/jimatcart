import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { optimizeBasket } from "../../src/domain";
import type { BasketInput } from "../../src/domain";
import { RecommendationView } from "../../src/features/recommendation/RecommendationView";
import { buildShoppingPlanText } from "../../src/features/recommendation/shoppingPlan";

function input(pairTravel = 300): BasketInput {
  return {
    stores: [
      { id: "a", name: "Alpha Mart" },
      { id: "b", name: "Bravo Grocer" },
    ],
    items: [
      {
        id: "rice",
        name: "Rice",
        quantity: 2,
        pricesByStoreId: { a: 1_500, b: 2_300 },
      },
      {
        id: "milk",
        name: "Milk",
        quantity: 1,
        pricesByStoreId: { a: 700, b: 200 },
      },
    ],
    tripCosts: [
      { storeIds: ["a"], costCents: 100 },
      { storeIds: ["b"], costCents: 250 },
      { storeIds: ["a", "b"], costCents: pairTravel },
    ],
  };
}

describe("RecommendationView", () => {
  it("shows the waiting state without a current comparison", () => {
    render(<RecommendationView input={null} recommendation={null} />);
    expect(screen.getByRole("heading", { name: /Complete your basket/i })).toBeInTheDocument();
  });

  it("shows quantities, travel, savings, and break-even", () => {
    const basket = input();
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);

    expect(
      screen.getByRole("heading", {
        name: /Lowest-cost option: Alpha Mart \+ Bravo Grocer/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Save RM3\.00/i).length).toBeGreaterThan(0);
    const alpha = screen.getByRole("region", { name: "Alpha Mart" });
    expect(within(alpha).getByText("Qty 2")).toBeInTheDocument();
    expect(screen.getByText("Final total")).toBeInTheDocument();
    expect(screen.getByText(/Groceries RM32\.00 \+ Travel RM3\.00/)).toBeInTheDocument();
    expect(screen.getByText("Net saving").nextElementSibling).toHaveTextContent("RM3.00");
    fireEvent.click(screen.getByText("Break-even details"));
    expect(screen.getByText(/Break-even combined-trip cost:/)).toBeInTheDocument();
    expect(screen.getByText("RM6.00")).toBeInTheDocument();
    expect(screen.getByText(/Below this amount, the pair is cheaper/i)).toBeInTheDocument();
    expect(
      screen.getByText(/At the exact amount, JimatCart chooses one shop/i),
    ).toBeInTheDocument();
  });

  it("frames tiny two-shop savings as a practical tradeoff", () => {
    const basket = input(590);
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    expect(
      screen.getAllByText(/Only RM0\.10 cheaper than one shop after travel/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/second stop may not be worth it/i).length,
    ).toBeGreaterThan(0);
  });

  it("explains the exact break-even tie", () => {
    const basket = input(600);
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    expect(
      screen.getByRole("heading", { name: /Lowest-cost option:/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Totals tie with a split plan/i).length).toBeGreaterThan(0);
  });

  it("copies and downloads the same current plan", async () => {
    const basket = input();
    const recommendation = optimizeBasket(basket);
    const expected = buildShoppingPlanText(basket, recommendation);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const createObjectURL = vi.fn().mockReturnValue("blob:plan");
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    render(<RecommendationView input={basket} recommendation={recommendation} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy plan" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expected));
    expect(screen.getByText("Saved to clipboard.")).toHaveAttribute("role", "status");

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Download plan" }));
    expect(await createObjectURL.mock.calls[0][0].text()).toBe(expected);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:plan");
    vi.useRealTimers();
  });

  it("renders why-this-plan reasons for a successful split", () => {
    const basket = input();
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    expect(screen.getByRole("heading", { name: "Why this plan won" })).toBeInTheDocument();
    expect(
      screen.getByText(/Alpha Mart is cheapest for Rice/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bravo Grocer is cheapest for Milk/i),
    ).toBeInTheDocument();
  });

  it("announces clipboard failure", async () => {
    const basket = input();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi
          .fn()
          .mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
      },
    });
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Clipboard permission denied/i,
    );
    expect(screen.getByRole("textbox", { name: /Shopping plan text/i })).toBeInTheDocument();
  });

  it("falls back when the Clipboard API is unavailable", async () => {
    const basket = input();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy plan" }));
    expect(await screen.findByText("Saved to clipboard.")).toBeInTheDocument();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});
