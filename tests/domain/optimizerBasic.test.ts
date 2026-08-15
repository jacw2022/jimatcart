import { describe, expect, it } from "vitest";
import { optimizeBasket } from "../../src/domain";
import type { BasketInput, BasketItem, Store } from "../../src/domain";

const alpha: Store = { id: "alpha", name: "Alpha Mart" };
const bravo: Store = { id: "bravo", name: "Bravo Grocer" };

function item(
  id: string,
  quantity: number,
  pricesByStoreId: BasketItem["pricesByStoreId"],
): BasketItem {
  return { id, name: id, quantity, pricesByStoreId };
}

function basket(items: BasketItem[]): BasketInput {
  return {
    items,
    stores: [alpha, bravo],
    tripCosts: [
      { storeIds: ["alpha"], costCents: 100 },
      { storeIds: ["bravo"], costCents: 250 },
      { storeIds: ["alpha", "bravo"], costCents: 300 },
    ],
  };
}

describe("optimizeBasket with basic quantities and unit prices", () => {
  it("multiplies each unit price by the whole-number quantity", () => {
    const result = optimizeBasket(
      basket([
        item("Rice", 2, { alpha: 500, bravo: 650 }),
        item("Milk", 1, { alpha: 300, bravo: 350 }),
      ]),
    );

    expect(result).toMatchObject({
      status: "success",
      storesUsed: ["alpha"],
      assignments: [
        { itemId: "Rice", storeId: "alpha", quantity: 2, lineTotalCents: 1000 },
        { itemId: "Milk", storeId: "alpha", quantity: 1, lineTotalCents: 300 },
      ],
      grocerySubtotalCents: 1300,
      travelCostCents: 100,
      finalTotalCents: 1400,
    });
  });

  it("keeps blank prices unavailable and can recommend a required split", () => {
    const result = optimizeBasket(
      basket([
        item("Rice", 1, { alpha: 500, bravo: null }),
        item("Milk", 2, { alpha: null, bravo: 300 }),
      ]),
    );

    expect(result).toMatchObject({
      status: "success",
      storesUsed: ["alpha", "bravo"],
      grocerySubtotalCents: 1100,
      travelCostCents: 300,
      finalTotalCents: 1400,
      bestSingleStoreTotalCents: null,
    });
  });

  it("uses total travel costs when comparing a split against one shop", () => {
    const result = optimizeBasket(
      basket([
        item("Rice", 1, { alpha: 100, bravo: 400 }),
        item("Milk", 1, { alpha: 500, bravo: 100 }),
      ]),
    );

    expect(result).toMatchObject({
      storesUsed: ["alpha", "bravo"],
      grocerySubtotalCents: 200,
      travelCostCents: 300,
      finalTotalCents: 500,
      bestSingleStoreTotalCents: 700,
      netSavingCents: 200,
      breakEvenTripCostCents: 500,
    });
  });

  it("prefers the alphabetically earlier shop for equal unit prices", () => {
    const result = optimizeBasket(
      basket([
        item("Tie", 1, { alpha: 100, bravo: 100 }),
        item("Alpha", 1, { alpha: 100, bravo: 900 }),
        item("Bravo", 1, { alpha: 900, bravo: 100 }),
      ]),
    );

    expect(result.assignments[0]).toMatchObject({ storeId: "alpha" });
  });

  it("prefers one shop at the exact pair-travel break-even", () => {
    const input = basket([
      item("Rice", 1, { alpha: 100, bravo: 400 }),
      item("Milk", 1, { alpha: 500, bravo: 100 }),
    ]);
    input.tripCosts[2].costCents = 500;

    const result = optimizeBasket(input);

    expect(result.storesUsed).toEqual(["alpha"]);
    expect(result.finalTotalCents).toBe(700);
    expect(result.breakEvenTripCostCents).toBe(500);
    expect(result.explanation.join(" ")).toMatch(/prefers fewer shops/i);
    expect(result.reasons.join(" ")).toMatch(/prefers one shop/i);
  });

  it("gives non-empty UI reasons for a winning split", () => {
    const result = optimizeBasket(
      basket([
        item("Rice", 1, { alpha: 100, bravo: 400 }),
        item("Milk", 1, { alpha: 500, bravo: 100 }),
      ]),
    );

    expect(result.status).toBe("success");
    expect(result.storesUsed).toEqual(["alpha", "bravo"]);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.join(" ")).toMatch(/Alpha Mart is cheapest for Rice/i);
    expect(result.reasons.join(" ")).toMatch(/Bravo Grocer is cheapest for Milk/i);
  });

  it("uses the actual single-shop travel cost when a nominal pair collapses", () => {
    const result = optimizeBasket(
      basket([
        item("Rice", 1, { alpha: 100, bravo: 500 }),
        item("Milk", 1, { alpha: 200, bravo: 600 }),
      ]),
    );

    expect(result).toMatchObject({
      storesUsed: ["alpha"],
      grocerySubtotalCents: 300,
      travelCostCents: 100,
      finalTotalCents: 400,
    });
  });

  it("names items unavailable at every shop", () => {
    const result = optimizeBasket(
      basket([item("Rice", 1, { alpha: null, bravo: null })]),
    );

    expect(result.status).toBe("no-valid-plan");
    expect(result.explanation.join(" ")).toMatch(/Rice/);
  });

  it("explains when covering the basket would require three shops", () => {
    const charlie: Store = { id: "charlie", name: "Charlie Market" };
    const input: BasketInput = {
      stores: [alpha, bravo, charlie],
      items: [
        item("Rice", 1, { alpha: 100, bravo: null, charlie: null }),
        item("Milk", 1, { alpha: null, bravo: 100, charlie: null }),
        item("Eggs", 1, { alpha: null, bravo: null, charlie: 100 }),
      ],
      tripCosts: [
        { storeIds: ["alpha"], costCents: 0 },
        { storeIds: ["bravo"], costCents: 0 },
        { storeIds: ["charlie"], costCents: 0 },
        { storeIds: ["alpha", "bravo"], costCents: 0 },
        { storeIds: ["alpha", "charlie"], costCents: 0 },
        { storeIds: ["bravo", "charlie"], costCents: 0 },
      ],
    };

    const result = optimizeBasket(input);

    expect(result.status).toBe("no-valid-plan");
    expect(result.explanation.join(" ")).toMatch(/require three shops/i);
  });
});
