import { describe, expect, it } from "vitest";
import { optimizeBasket } from "../../src/domain";
import type { BasketInput, BasketItem, Store } from "../../src/domain";

const alpha: Store = { id: "alpha", name: "Alpha Mart" };
const bravo: Store = { id: "bravo", name: "Bravo Grocer" };
const charlie: Store = { id: "charlie", name: "Charlie Market" };

function item(
  id: string,
  name: string,
  pricesByStoreId: BasketItem["pricesByStoreId"],
  quantity = 1,
): BasketItem {
  return { id, name, quantity, pricesByStoreId };
}

function basket(
  items: BasketItem[],
  stores: Store[] = [alpha, bravo],
  extraStopCostCents = 0,
): BasketInput {
  return { items, stores, extraStopCostCents };
}

describe("optimizeBasket", () => {
  it("selects the cheapest complete single shop and includes quantities", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 500, bravo: 600 }, 2),
          item("milk", "Milk", { alpha: 300, bravo: 350 }),
        ],
        [bravo, alpha],
        250,
      ),
    );

    expect(result).toMatchObject({
      status: "success",
      storesUsed: ["alpha"],
      assignments: [
        {
          itemId: "rice",
          storeId: "alpha",
          quantity: 2,
          lineTotalCents: 1_000,
        },
        {
          itemId: "milk",
          storeId: "alpha",
          quantity: 1,
          lineTotalCents: 300,
        },
      ],
      grocerySubtotalCents: 1_300,
      extraStopCostCents: 0,
      finalTotalCents: 1_300,
      bestSingleStoreTotalCents: 1_300,
      netSavingCents: 0,
      breakEvenExtraCostCents: null,
    });
    expect(result.explanation.join(" ")).toMatch(/Alpha Mart/);
  });

  it("selects a split that stays cheaper after the extra-stop cost", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 100, bravo: 200 }),
          item("milk", "Milk", { alpha: 400, bravo: 100 }),
        ],
        [alpha, bravo],
        50,
      ),
    );

    expect(result).toMatchObject({
      status: "success",
      storesUsed: ["alpha", "bravo"],
      assignments: [
        {
          itemId: "rice",
          storeId: "alpha",
          lineTotalCents: 100,
        },
        {
          itemId: "milk",
          storeId: "bravo",
          lineTotalCents: 100,
        },
      ],
      grocerySubtotalCents: 200,
      extraStopCostCents: 50,
      finalTotalCents: 250,
      bestSingleStoreTotalCents: 300,
      netSavingCents: 50,
      breakEvenExtraCostCents: 100,
    });
    expect(result.explanation.join(" ")).toMatch(/save RM0\.50/i);
  });

  it("selects one shop when the extra stop erases the split saving", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 100, bravo: 200 }),
          item("milk", "Milk", { alpha: 400, bravo: 100 }),
        ],
        [alpha, bravo],
        150,
      ),
    );

    expect(result).toMatchObject({
      storesUsed: ["bravo"],
      grocerySubtotalCents: 300,
      extraStopCostCents: 0,
      finalTotalCents: 300,
      bestSingleStoreTotalCents: 300,
      netSavingCents: 0,
      breakEvenExtraCostCents: 100,
    });
  });

  it("prefers one shop at the exact break-even cost", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 100, bravo: 200 }),
          item("milk", "Milk", { alpha: 400, bravo: 100 }),
        ],
        [alpha, bravo],
        100,
      ),
    );

    expect(result.storesUsed).toEqual(["bravo"]);
    expect(result.finalTotalCents).toBe(300);
    expect(result.breakEvenExtraCostCents).toBe(100);
    expect(result.explanation.join(" ")).toMatch(/fewer stops/i);
  });

  it.each([
    [0, /no non-negative extra-trip cost/i],
    [-20, /no non-negative extra-trip cost/i],
  ])(
    "explains a %i-cent break-even difference that cannot favour a split",
    (expectedBreakEven, explanationPattern) => {
      const charliePrice = expectedBreakEven === 0 ? 100 : 90;
      const result = optimizeBasket(
        basket(
          [
            item("rice", "Rice", {
              alpha: 100,
              bravo: 900,
              charlie: charliePrice,
            }),
            item("milk", "Milk", {
              alpha: 900,
              bravo: 100,
              charlie: charliePrice,
            }),
          ],
          [bravo, charlie, alpha],
          0,
        ),
      );

      expect(result.storesUsed).toEqual(["charlie"]);
      expect(result.breakEvenExtraCostCents).toBe(expectedBreakEven);
      expect(result.explanation.join(" ")).toMatch(explanationPattern);
    },
  );

  it("recommends an unavoidable pair without inventing a single-shop comparison", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 400, bravo: null }),
          item("milk", "Milk", { alpha: null, bravo: 300 }),
        ],
        [alpha, bravo],
        75,
      ),
    );

    expect(result).toMatchObject({
      status: "success",
      storesUsed: ["alpha", "bravo"],
      grocerySubtotalCents: 700,
      extraStopCostCents: 75,
      finalTotalCents: 775,
      bestSingleStoreTotalCents: null,
      netSavingCents: null,
      breakEvenExtraCostCents: null,
    });
    expect(result.explanation.join(" ")).toMatch(
      /no single shop covers every item/i,
    );
  });

  it("names items that are unavailable everywhere", () => {
    const result = optimizeBasket(
      basket([
        item("rice", "Rice", { alpha: null, bravo: null }),
        item("milk", "Fresh Milk", { alpha: 300, bravo: 320 }),
      ]),
    );

    expect(result).toMatchObject({
      status: "no-valid-plan",
      storesUsed: [],
      assignments: [],
      grocerySubtotalCents: 0,
      extraStopCostCents: 0,
      finalTotalCents: 0,
      bestSingleStoreTotalCents: null,
      netSavingCents: null,
      breakEvenExtraCostCents: null,
    });
    expect(result.explanation.join(" ")).toMatch(/Rice/);
    expect(result.explanation.join(" ")).not.toMatch(/Fresh Milk/);
  });

  it("explains when a complete basket would require three shops", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 100, bravo: null, charlie: null }),
          item("milk", "Milk", { alpha: null, bravo: 100, charlie: null }),
          item("eggs", "Eggs", { alpha: null, bravo: null, charlie: 100 }),
        ],
        [alpha, bravo, charlie],
      ),
    );

    expect(result.status).toBe("no-valid-plan");
    expect(result.explanation.join(" ")).toMatch(/require three shops/i);
  });

  it("uses the alphabetically earlier shop for equal item prices", () => {
    const zeta: Store = { id: "zeta", name: "Zeta Shop" };
    const result = optimizeBasket(
      basket(
        [
          item("tied", "Tied item", { alpha: 100, zeta: 100 }),
          item("zeta-cheap", "Zeta item", { alpha: 900, zeta: 100 }),
          item("alpha-cheap", "Alpha item", { alpha: 100, zeta: 900 }),
        ],
        [zeta, alpha],
      ),
    );

    expect(result.storesUsed).toEqual(["alpha", "zeta"]);
    expect(result.assignments[0]).toMatchObject({
      itemId: "tied",
      storeId: "alpha",
    });
  });

  it("uses the alphabetical store signature when single totals tie", () => {
    const zeta: Store = { id: "zeta", name: "Zeta Shop" };
    const result = optimizeBasket(
      basket([item("rice", "Rice", { alpha: 100, zeta: 100 })], [zeta, alpha]),
    );

    expect(result.storesUsed).toEqual(["alpha"]);
  });

  it("uses the alphabetical store signature when pair totals tie", () => {
    const result = optimizeBasket(
      basket(
        [
          item("a", "A item", { alpha: 100, bravo: 500, charlie: 500 }),
          item("b", "B item", { alpha: 500, bravo: 100, charlie: 500 }),
          item("c", "C item", { alpha: 500, bravo: 500, charlie: 100 }),
        ],
        [charlie, bravo, alpha],
      ),
    );

    expect(result.finalTotalCents).toBe(700);
    expect(result.storesUsed).toEqual(["alpha", "bravo"]);
  });

  it("collapses a nominal pair and does not add an extra-stop cost", () => {
    const result = optimizeBasket(
      basket(
        [
          item("rice", "Rice", { alpha: 100, bravo: 200 }),
          item("milk", "Milk", { alpha: 300, bravo: 400 }),
        ],
        [alpha, bravo],
        9_999,
      ),
    );

    expect(result.storesUsed).toEqual(["alpha"]);
    expect(result.extraStopCostCents).toBe(0);
    expect(result.finalTotalCents).toBe(400);
    expect(result.breakEvenExtraCostCents).toBeNull();
  });

  it("does not mutate its input", () => {
    const input = basket(
      [
        item("rice", "Rice", Object.freeze({ alpha: 100, bravo: 200 })),
        item("milk", "Milk", Object.freeze({ alpha: 400, bravo: 100 })),
      ].map((basketItem) => Object.freeze(basketItem)),
      [alpha, bravo].map((store) => Object.freeze(store)),
      50,
    );
    Object.freeze(input.items);
    Object.freeze(input.stores);
    Object.freeze(input);

    expect(() => optimizeBasket(input)).not.toThrow();
    expect(optimizeBasket(input).finalTotalCents).toBe(250);
  });

  it("agrees with an independent exhaustive assignment oracle", () => {
    const stores = [alpha, bravo, charlie];
    const pricePatterns: Array<Array<number | null>> = [
      [100, 240, null],
      [320, 120, 260],
      [null, 280, 140],
      [190, null, 310],
    ];
    const tripCosts = [0, 75, 225];

    function oracle(input: BasketInput) {
      type OraclePlan = {
        storesUsed: string[];
        assignments: Array<{ itemId: string; storeId: string }>;
        finalTotalCents: number;
      };
      const plans: OraclePlan[] = [];

      function enumerate(
        itemIndex: number,
        assignments: Array<{ itemId: string; storeId: string }>,
        groceryTotal: number,
      ) {
        if (itemIndex === input.items.length) {
          const storeIds = [...new Set(assignments.map(({ storeId }) => storeId))]
            .sort((leftId, rightId) => {
              const left = input.stores.find(({ id }) => id === leftId)!;
              const right = input.stores.find(({ id }) => id === rightId)!;
              return left.name.localeCompare(right.name, "en-MY") || left.id.localeCompare(right.id);
            });
          if (storeIds.length === 0 || storeIds.length > 2) return;
          plans.push({
            storesUsed: storeIds,
            assignments: [...assignments],
            finalTotalCents:
              groceryTotal + (storeIds.length === 2 ? input.extraStopCostCents : 0),
          });
          return;
        }

        const basketItem = input.items[itemIndex];
        for (const store of input.stores) {
          const unitPrice = basketItem.pricesByStoreId[store.id] ?? null;
          if (unitPrice === null) continue;
          enumerate(
            itemIndex + 1,
            [...assignments, { itemId: basketItem.id, storeId: store.id }],
            groceryTotal + unitPrice * basketItem.quantity,
          );
        }
      }

      enumerate(0, [], 0);
      plans.sort(
        (left, right) =>
          left.finalTotalCents - right.finalTotalCents ||
          left.storesUsed.length - right.storesUsed.length ||
          left.storesUsed
            .map((id) => input.stores.find((store) => store.id === id)!.name)
            .join("\u0000")
            .localeCompare(
              right.storesUsed
                .map((id) => input.stores.find((store) => store.id === id)!.name)
                .join("\u0000"),
              "en-MY",
            ),
      );
      return plans[0] ?? null;
    }

    for (let itemCount = 1; itemCount <= pricePatterns.length; itemCount += 1) {
      for (const extraStopCostCents of tripCosts) {
        const input: BasketInput = {
          stores: [...stores].reverse(),
          items: pricePatterns.slice(0, itemCount).map((prices, index) =>
            item(
              `generated-${index}`,
              `Generated item ${index}`,
              Object.fromEntries(stores.map((store, storeIndex) => [store.id, prices[storeIndex]])),
              (index % 3) + 1,
            ),
          ),
          extraStopCostCents,
        };
        const expected = oracle(input);
        const actual = optimizeBasket(input);

        expect(actual.status).toBe(expected ? "success" : "no-valid-plan");
        if (expected && actual.status === "success") {
          expect(actual.finalTotalCents).toBe(expected.finalTotalCents);
          expect(actual.storesUsed).toEqual(expected.storesUsed);
          expect(
            actual.assignments.map(({ itemId, storeId }) => ({ itemId, storeId })),
          ).toEqual(expected.assignments);
        }
      }
    }
  });
});
