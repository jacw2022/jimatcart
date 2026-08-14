import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { optimizeBasket } from "../../src/domain";
import type { BasketInput, BasketItem, Store } from "../../src/domain";
import { RecommendationView } from "../../src/features/recommendation/RecommendationView";

const lotus: Store = { id: "lotus", name: "Lotus's" };
const nsk: Store = { id: "nsk", name: "NSK" };
const mydin: Store = { id: "mydin", name: "Mydin" };

function item(
  id: string,
  name: string,
  pricesByStoreId: BasketItem["pricesByStoreId"],
  quantity = 1,
): BasketItem {
  return { id, name, quantity, pricesByStoreId };
}

function input(
  items: BasketItem[],
  stores: Store[] = [lotus, nsk],
  extraStopCostCents = 0,
): BasketInput {
  return { items, stores, extraStopCostCents };
}

function renderRecommendation(basketInput: BasketInput) {
  const recommendation = optimizeBasket(basketInput);
  render(
    <RecommendationView
      input={basketInput}
      recommendation={recommendation}
    />,
  );
  return recommendation;
}

describe("RecommendationView", () => {
  it("shows the waiting state while the editable basket is invalid", () => {
    render(<RecommendationView input={null} recommendation={null} />);

    expect(
      screen.getByRole("heading", {
        name: "Complete your basket to see a recommendation",
      }),
    ).toBeInTheDocument();
  });

  it("presents a complete one-shop recommendation", () => {
    renderRecommendation(
      input([
        item("rice", "Rice", { lotus: 500, nsk: 600 }, 2),
        item("milk", "Milk", { lotus: 300, nsk: 350 }),
      ]),
    );

    expect(
      screen.getByRole("heading", { name: "Buy everything at Lotus's" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Final total").nextElementSibling).toHaveTextContent(
      "RM13.00",
    );
    expect(screen.getByText("Quantity 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why this plan won" })).toBeInTheDocument();
  });

  it("presents a saving split with grouped assignments and comparison values", () => {
    renderRecommendation(
      input(
        [
          item("rice", "Rice", { lotus: 100, nsk: 200 }),
          item("milk", "Milk", { lotus: 400, nsk: 100 }),
        ],
        [lotus, nsk],
        50,
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "Split between Lotus's and NSK to save RM0.50",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Best value/i)).not.toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();

    const lotusPlan = screen.getByRole("region", { name: "Lotus's" });
    const nskPlan = screen.getByRole("region", { name: "NSK" });
    expect(within(lotusPlan).getByText("Rice")).toBeInTheDocument();
    expect(within(nskPlan).getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Break-even extra-stop cost: RM1.00")).toBeInTheDocument();
    expect(screen.getByText("Net saving").nextElementSibling).toHaveTextContent("RM0.50");
    expect(screen.getByRole("heading", { name: "Cost breakdown" }).closest("section"))
      .toHaveClass("cost-breakdown");
  });

  it("explains when the extra stop makes splitting cost more", () => {
    renderRecommendation(
      input(
        [
          item("rice", "Rice", { lotus: 100, nsk: 200 }),
          item("milk", "Milk", { lotus: 400, nsk: 100 }),
        ],
        [lotus, nsk],
        150,
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "Buy everything at NSK — splitting would cost RM0.50 more",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Extra cost if split").nextElementSibling).toHaveTextContent(
      "RM0.50",
    );
  });

  it("explains exact break-even and prefers one shop", () => {
    renderRecommendation(
      input(
        [
          item("rice", "Rice", { lotus: 100, nsk: 200 }),
          item("milk", "Milk", { lotus: 400, nsk: 100 }),
        ],
        [lotus, nsk],
        100,
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "One shop costs the same — buy everything at NSK",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/prefers fewer stops/i)).toHaveLength(2);
    expect(screen.getByText(/at this exact amount/i)).toBeInTheDocument();
  });

  it("shows an unavoidable split without a fabricated one-shop comparison", () => {
    renderRecommendation(
      input(
        [
          item("rice", "Rice", { lotus: 400, nsk: null }),
          item("milk", "Milk", { lotus: null, nsk: 300 }),
        ],
        [lotus, nsk],
        75,
      ),
    );

    expect(screen.getByText(/No single shop has every item/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Split between Lotus's and NSK" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Best single shop")).not.toBeInTheDocument();
    expect(screen.queryByText("Net saving")).not.toBeInTheDocument();
    expect(screen.queryByText(/Break-even extra-stop cost:/)).not.toBeInTheDocument();
  });

  it("shows a no-plan explanation for a basket that requires three shops", () => {
    renderRecommendation(
      input(
        [
          item("rice", "Rice", { lotus: 100, nsk: null, mydin: null }),
          item("milk", "Milk", { lotus: null, nsk: 100, mydin: null }),
          item("eggs", "Eggs", { lotus: null, nsk: null, mydin: 100 }),
        ],
        [lotus, nsk, mydin],
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "This basket needs another price option",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/would require three shops/i)).toBeInTheDocument();
    expect(screen.queryByText("Final total")).not.toBeInTheDocument();
  });

  it("scrolls the first completed result into view without moving focus", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    const basketInput = input([item("rice", "Rice", { lotus: 100 })], [lotus]);

    const recommendation = optimizeBasket(basketInput);
    const { rerender } = render(
      <RecommendationView input={null} recommendation={null} />,
    );
    rerender(
      <RecommendationView input={basketInput} recommendation={recommendation} />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(document.activeElement).toBe(document.body);
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });
});
