import { describe, expect, it } from "vitest";
import type { BasketDraft } from "../../src/features/basket/basketDraft";
import { toBasketInput } from "../../src/features/basket/basketDraft";
import {
  formatItemsStatusHint,
  summarizeItemPrices,
} from "../../src/features/basket/wizardSteps";

const draft: BasketDraft = {
  shops: [
    { id: "a", name: "Shop A" },
    { id: "b", name: "Shop B" },
  ],
  items: [
    {
      id: "rice",
      name: "Rice",
      quantityInput: "1",
      priceInputsByStoreId: { a: "5.555", b: "2.00" },
      unavailableByStoreId: {},
    },
  ],
  tripCosts: [
    { storeIds: ["a"], costInput: "1.00" },
    { storeIds: ["b"], costInput: "2.00" },
    { storeIds: ["a", "b"], costInput: "3.00" },
  ],
};

describe("wizard item price status", () => {
  it("counts only valid prices and surfaces invalid entries in the hint", () => {
    const status = summarizeItemPrices(draft);
    expect(status).toMatchObject({
      priced: 1,
      invalid: 1,
      openSlots: 0,
      totalSlots: 2,
    });

    const errors = toBasketInput(draft).errors;
    expect(formatItemsStatusHint(draft, errors, false)).toMatch(
      /1 of 2 prices entered · 1 need fixing/i,
    );
  });
});
