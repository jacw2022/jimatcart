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
      unavailableByStoreId: { b: true },
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

  it("rejects blank prices that are not marked Unavailable", () => {
    const result = toBasketInput({
      ...draft,
      items: [
        {
          ...draft.items[0],
          unavailableByStoreId: {},
          priceInputsByStoreId: { a: "18.90", b: "" },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.prices.rice.b).toMatch(/mark Unavailable/i);
  });

  it("names the item when every shop is marked Unavailable", () => {
    const result = toBasketInput({
      ...draft,
      items: [
        {
          ...draft.items[0],
          priceInputsByStoreId: { a: "", b: "" },
          unavailableByStoreId: { a: true, b: true },
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.availability.rice).toMatch(
      /No selected shop stocks Rice/i,
    );
    expect(result.errors.availability.rice).toMatch(/remove this item/i);
  });

  it("accepts a free promotional item price", () => {
    const result = toBasketInput({
      ...draft,
      items: [
        {
          ...draft.items[0],
          priceInputsByStoreId: { a: "0", b: "" },
          unavailableByStoreId: { b: true },
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.items[0].pricesByStoreId.a).toBe(0);
    }
  });

  it("accepts pasted prices with RM prefix and thousands separators", () => {
    const result = toBasketInput({
      ...draft,
      items: [
        {
          ...draft.items[0],
          priceInputsByStoreId: { a: "RM 18.90", b: "1,200.00" },
          unavailableByStoreId: {},
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.items[0].pricesByStoreId).toEqual({
        a: 1_890,
        b: 120_000,
      });
    }
  });
});
