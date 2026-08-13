import { describe, expect, it } from "vitest";
import {
  EMPTY_BASKET_DRAFT,
  toBasketInput,
} from "../../src/features/basket/basketDraft";
import type { BasketDraft } from "../../src/features/basket/basketDraft";

function completeDraft(): BasketDraft {
  return {
    shops: [
      { id: "lotus", name: " Lotus's " },
      { id: "nsk", name: "NSK" },
    ],
    items: [
      {
        id: "rice",
        name: " Rice ",
        quantityInput: "2",
        priceInputsByStoreId: { lotus: " 18.5 ", nsk: "" },
      },
    ],
    extraStopCostInput: "5.25",
  };
}

describe("toBasketInput", () => {
  it("converts valid editable strings to domain cents without mutating the draft", () => {
    const draft = completeDraft();
    const original = structuredClone(draft);

    expect(toBasketInput(draft)).toEqual({
      ok: true,
      input: {
        stores: [
          { id: "lotus", name: "Lotus's" },
          { id: "nsk", name: "NSK" },
        ],
        items: [
          {
            id: "rice",
            name: "Rice",
            quantity: 2,
            pricesByStoreId: { lotus: 1_850, nsk: null },
          },
        ],
        extraStopCostCents: 525,
      },
      errors: {
        general: [],
        shopNames: {},
        itemNames: {},
        quantities: {},
        prices: {},
        availability: {},
      },
    });
    expect(draft).toEqual(original);
    expect(draft.items[0].priceInputsByStoreId.lotus).toBe(" 18.5 ");
  });

  it("keeps blank price cells as unavailable", () => {
    const result = toBasketInput(completeDraft());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.items[0].pricesByStoreId.nsk).toBeNull();
    }
  });

  it("reports empty-state requirements", () => {
    const result = toBasketInput(EMPTY_BASKET_DRAFT);

    expect(result.ok).toBe(false);
    expect(result.errors.general).toEqual([
      "Add between one and three shops.",
      "Add at least one grocery item.",
    ]);
  });

  it("detects duplicate names without changing their display spelling", () => {
    const draft = completeDraft();
    draft.shops[1].name = " lotus'S ";
    draft.items.push({
      id: "rice-two",
      name: "rice",
      quantityInput: "1",
      priceInputsByStoreId: { lotus: "5", nsk: "6" },
    });

    const result = toBasketInput(draft);

    expect(result.ok).toBe(false);
    expect(result.errors.shopNames).toEqual({
      lotus: "Shop names must be unique.",
      nsk: "Shop names must be unique.",
    });
    expect(result.errors.itemNames).toEqual({
      rice: "Item names must be unique.",
      "rice-two": "Item names must be unique.",
    });
    expect(draft.shops[1].name).toBe(" lotus'S ");
  });

  it("separates price syntax, range, quantity, and availability errors", () => {
    const draft = completeDraft();
    draft.items[0].quantityInput = "1.5";
    draft.items[0].priceInputsByStoreId = {
      lotus: "RM5.00",
      nsk: "0",
    };
    draft.extraStopCostInput = "1000.00";

    const result = toBasketInput(draft);

    expect(result.ok).toBe(false);
    expect(result.errors.quantities.rice).toMatch(/whole number/i);
    expect(result.errors.prices.rice.lotus).toMatch(/two decimal places/i);
    expect(result.errors.prices.rice.nsk).toMatch(/at least RM0\.01/i);
    expect(result.errors.availability.rice).toMatch(/correct at least one price/i);
    expect(result.errors.extraStopCost).toMatch(/must not exceed RM999\.99/i);
  });

  it("requires every item to be available at one or more shops", () => {
    const draft = completeDraft();
    draft.items[0].priceInputsByStoreId = { lotus: "", nsk: "" };

    const result = toBasketInput(draft);

    expect(result.ok).toBe(false);
    expect(result.errors.availability.rice).toMatch(/one or more shops/i);
  });
});
