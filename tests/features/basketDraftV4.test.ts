import { describe, expect, it } from "vitest";
import { toBasketInput } from "../../src/features/basket/basketDraft";
import type { BasketDraft } from "../../src/features/basket/basketDraft";

const draft: BasketDraft = {
  shops: [
    { id: "a", name: "Shop A" },
    { id: "b", name: "Shop B" },
  ],
  items: [
    {
      id: "rice",
      name: "Rice",
      quantityInput: "2",
      priceInputsByStoreId: { a: "18.90", b: "" },
    },
  ],
  tripCosts: [
    { storeIds: ["a"], costInput: "1.00" },
    { storeIds: ["b"], costInput: "2.50" },
    { storeIds: ["a", "b"], costInput: "3.00" },
  ],
};

describe("basic basket draft conversion", () => {
  it("converts quantities, prices and total trip costs at the domain boundary", () => {
    expect(toBasketInput(draft)).toMatchObject({
      ok: true,
      input: {
        items: [
          {
            id: "rice",
            quantity: 2,
            pricesByStoreId: { a: 1890, b: null },
          },
        ],
        tripCosts: [
          { storeIds: ["a"], costCents: 100 },
          { storeIds: ["b"], costCents: 250 },
          { storeIds: ["a", "b"], costCents: 300 },
        ],
      },
    });
  });

  it("rejects quantities outside 1 to 99", () => {
    const result = toBasketInput({
      ...draft,
      items: [{ ...draft.items[0], quantityInput: "1.5" }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.quantities.rice).toMatch(/whole number/i);
  });
});
