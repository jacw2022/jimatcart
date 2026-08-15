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

    expect(screen.getByRole("heading", { name: /Split between Alpha Mart and Bravo Grocer/i })).toBeInTheDocument();
    const alpha = screen.getByRole("region", { name: "Alpha Mart" });
    expect(within(alpha).getByText("Quantity 2")).toBeInTheDocument();
    expect(screen.getByText("Grocery checkout").nextElementSibling).toHaveTextContent("RM32.00");
    expect(screen.getByText("Estimated travel").nextElementSibling).toHaveTextContent("RM3.00");
    expect(screen.getByText(/Break-even combined-trip cost: RM6.00/)).toBeInTheDocument();
  });

  it("explains the exact break-even tie", () => {
    const basket = input(600);
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    expect(screen.getByRole("heading", { name: /One shop costs the same/i })).toBeInTheDocument();
    expect(screen.getAllByText(/prefers fewer shops/i)).not.toHaveLength(0);
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
    fireEvent.click(screen.getByRole("button", { name: "Copy shopping plan" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expected));
    expect(screen.getByText("Saved to clipboard.")).toHaveAttribute("role", "status");

    fireEvent.click(screen.getByRole("button", { name: "Download shopping plan" }));
    expect(await createObjectURL.mock.calls[0][0].text()).toBe(expected);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:plan");
  });

  it("announces clipboard failure", async () => {
    const basket = input();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new DOMException("Denied")) },
    });
    render(<RecommendationView input={basket} recommendation={optimizeBasket(basket)} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy shopping plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not copy/i);
  });
});
