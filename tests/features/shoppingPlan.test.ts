import { describe, expect, it } from "vitest";
import { optimizeBasket } from "../../src/domain";
import type { BasketInput } from "../../src/domain";
import { buildShoppingPlanText } from "../../src/features/recommendation/shoppingPlan";

const input: BasketInput = {
  stores: [
    { id: "a", name: "Shop A" },
    { id: "b", name: "Shop B" },
  ],
  items: [
    {
      id: "rice",
      name: "Rice\nPremium",
      quantity: 2,
      pricesByStoreId: { a: 1_200, b: 2_500 },
    },
  ],
  tripCosts: [
    { storeIds: ["a"], costCents: 100 },
    { storeIds: ["b"], costCents: 250 },
    { storeIds: ["a", "b"], costCents: 300 },
  ],
};

describe("buildShoppingPlanText", () => {
  it("exports actionable quantities and complete costs without route order", () => {
    const text = buildShoppingPlanText(input, optimizeBasket(input));

    expect(text).toContain("Rice Premium: quantity 2 — RM24.00");
    expect(text).toContain("Estimated travel cost: RM1.00");
    expect(text).toContain("Final total: RM25.00");
    expect(text).toContain("Why this plan");
    expect(text).toContain("Prices and travel estimates were entered manually");
    expect(text).not.toMatch(/Stop 1|rice\nPremium/);
  });

  it("does not export a no-plan recommendation", () => {
    const noPlanInput: BasketInput = {
      ...input,
      items: [
        {
          ...input.items[0],
          pricesByStoreId: { a: null, b: null },
        },
      ],
    };
    expect(buildShoppingPlanText(noPlanInput, optimizeBasket(noPlanInput))).toBeNull();
  });
});
