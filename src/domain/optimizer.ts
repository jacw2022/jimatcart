import {
  calculateLineTotalCents,
  formatRm,
  validateExtraStopCostCents,
  validateItemPriceCents,
} from "./money";
import type {
  BasketInput,
  BasketItem,
  MoneyCents,
  PurchaseAssignment,
  Recommendation,
  Store,
} from "./types";

interface CandidatePlan {
  stores: Store[];
  assignments: PurchaseAssignment[];
  grocerySubtotalCents: MoneyCents;
  extraStopCostCents: MoneyCents;
  finalTotalCents: MoneyCents;
}

const storeNameCollator = new Intl.Collator("en-MY", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
});

function compareText(left: string, right: string): number {
  const alphabeticalResult = storeNameCollator.compare(left, right);

  if (alphabeticalResult !== 0) {
    return alphabeticalResult;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

function compareStores(left: Store, right: Store): number {
  return compareText(left.name, right.name) || compareText(left.id, right.id);
}

function compareStoreLists(left: Store[], right: Store[]): number {
  const comparedLength = Math.min(left.length, right.length);

  for (let index = 0; index < comparedLength; index += 1) {
    const comparison = compareStores(left[index], right[index]);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return left.length - right.length;
}

function compareCandidates(left: CandidatePlan, right: CandidatePlan): number {
  return (
    left.finalTotalCents - right.finalTotalCents ||
    left.stores.length - right.stores.length ||
    compareStoreLists(left.stores, right.stores)
  );
}

function addCents(left: MoneyCents, right: MoneyCents): MoneyCents | null {
  const total = left + right;
  return Number.isSafeInteger(total) ? total : null;
}

function priceAt(item: BasketItem, store: Store): MoneyCents | null {
  return item.pricesByStoreId[store.id] ?? null;
}

function buildAssignment(
  item: BasketItem,
  store: Store,
  unitPriceCents: MoneyCents,
): PurchaseAssignment | null {
  const lineTotal = calculateLineTotalCents(unitPriceCents, item.quantity);

  if (!lineTotal.ok) {
    return null;
  }

  return {
    itemId: item.id,
    storeId: store.id,
    quantity: item.quantity,
    lineTotalCents: lineTotal.cents,
  };
}

function buildSingleStoreCandidate(
  input: BasketInput,
  store: Store,
): CandidatePlan | null {
  const assignments: PurchaseAssignment[] = [];
  let grocerySubtotalCents = 0;

  for (const item of input.items) {
    const unitPriceCents = priceAt(item, store);

    if (unitPriceCents === null) {
      return null;
    }

    const assignment = buildAssignment(item, store, unitPriceCents);

    if (!assignment) {
      return null;
    }

    const nextSubtotal = addCents(
      grocerySubtotalCents,
      assignment.lineTotalCents,
    );

    if (nextSubtotal === null) {
      return null;
    }

    assignments.push(assignment);
    grocerySubtotalCents = nextSubtotal;
  }

  return {
    stores: [store],
    assignments,
    grocerySubtotalCents,
    extraStopCostCents: 0,
    finalTotalCents: grocerySubtotalCents,
  };
}

function chooseStoreForItem(
  item: BasketItem,
  firstStore: Store,
  secondStore: Store,
): { store: Store; unitPriceCents: MoneyCents } | null {
  const firstPrice = priceAt(item, firstStore);
  const secondPrice = priceAt(item, secondStore);

  if (firstPrice === null && secondPrice === null) {
    return null;
  }

  if (firstPrice === null) {
    return { store: secondStore, unitPriceCents: secondPrice as MoneyCents };
  }

  if (secondPrice === null) {
    return { store: firstStore, unitPriceCents: firstPrice };
  }

  if (firstPrice < secondPrice) {
    return { store: firstStore, unitPriceCents: firstPrice };
  }

  if (secondPrice < firstPrice) {
    return { store: secondStore, unitPriceCents: secondPrice };
  }

  const store =
    compareStores(firstStore, secondStore) <= 0 ? firstStore : secondStore;
  return { store, unitPriceCents: firstPrice };
}

function buildTwoStoreCandidate(
  input: BasketInput,
  firstStore: Store,
  secondStore: Store,
): CandidatePlan | null {
  const assignments: PurchaseAssignment[] = [];
  const usedStoreIds = new Set<string>();
  let grocerySubtotalCents = 0;

  for (const item of input.items) {
    const selection = chooseStoreForItem(item, firstStore, secondStore);

    if (!selection) {
      return null;
    }

    const assignment = buildAssignment(
      item,
      selection.store,
      selection.unitPriceCents,
    );

    if (!assignment) {
      return null;
    }

    const nextSubtotal = addCents(
      grocerySubtotalCents,
      assignment.lineTotalCents,
    );

    if (nextSubtotal === null) {
      return null;
    }

    assignments.push(assignment);
    usedStoreIds.add(selection.store.id);
    grocerySubtotalCents = nextSubtotal;
  }

  const stores = [firstStore, secondStore]
    .filter((store) => usedStoreIds.has(store.id))
    .sort(compareStores);
  const extraStopCostCents =
    stores.length === 2 ? input.extraStopCostCents : 0;
  const finalTotalCents = addCents(
    grocerySubtotalCents,
    extraStopCostCents,
  );

  if (finalTotalCents === null) {
    return null;
  }

  return {
    stores,
    assignments,
    grocerySubtotalCents,
    extraStopCostCents,
    finalTotalCents,
  };
}

function createNoPlan(explanation: string[]): Recommendation {
  return {
    status: "no-valid-plan",
    storesUsed: [],
    assignments: [],
    grocerySubtotalCents: 0,
    extraStopCostCents: 0,
    finalTotalCents: 0,
    bestSingleStoreTotalCents: null,
    netSavingCents: null,
    breakEvenExtraCostCents: null,
    explanation,
  };
}

function findInputProblem(input: BasketInput): string | null {
  if (input.items.length === 0) {
    return "Add at least one basket item before finding a shopping plan.";
  }

  if (input.stores.length < 1 || input.stores.length > 3) {
    return "Choose between one and three shops before finding a shopping plan.";
  }

  if (!validateExtraStopCostCents(input.extraStopCostCents).ok) {
    return "Enter a valid extra-stop cost before finding a shopping plan.";
  }

  const storeIds = new Set<string>();

  for (const store of input.stores) {
    if (!store.id || !store.name.trim() || storeIds.has(store.id)) {
      return "Every shop must have a unique ID and a name.";
    }

    storeIds.add(store.id);
  }

  const itemIds = new Set<string>();

  for (const item of input.items) {
    if (!item.id || !item.name.trim() || itemIds.has(item.id)) {
      return "Every basket item must have a unique ID and a name.";
    }

    itemIds.add(item.id);

    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return `Enter a whole-number quantity from 1 to 99 for ${item.name}.`;
    }

    for (const store of input.stores) {
      const price = priceAt(item, store);

      if (price !== null && !validateItemPriceCents(price).ok) {
        return `Enter a valid item price for ${item.name} at ${store.name}.`;
      }
    }
  }

  return null;
}

function explainSuccess(
  winner: CandidatePlan,
  bestSingleStoreTotalCents: MoneyCents | null,
  netSavingCents: MoneyCents | null,
  breakEvenExtraCostCents: MoneyCents | null,
  enteredExtraStopCostCents: MoneyCents,
): string[] {
  const storeNames = winner.stores.map((store) => store.name);
  const explanation =
    winner.stores.length === 1
      ? [`Buy everything at ${storeNames[0]}.`]
      : [`Split the basket between ${storeNames.join(" and ")}.`];

  explanation.push(
    `Groceries cost ${formatRm(winner.grocerySubtotalCents)}${
      winner.stores.length === 2
        ? `, plus ${formatRm(winner.extraStopCostCents)} for the extra stop`
        : ""
    }, for a final total of ${formatRm(winner.finalTotalCents)}.`,
  );

  if (bestSingleStoreTotalCents === null) {
    explanation.push(
      "No single shop covers every item, so a single-shop comparison is unavailable.",
    );
    return explanation;
  }

  if (winner.stores.length === 2 && netSavingCents !== null && netSavingCents > 0) {
    explanation.push(
      `This plan will save ${formatRm(netSavingCents)} compared with the best single-shop total of ${formatRm(bestSingleStoreTotalCents)}.`,
    );
  }

  if (breakEvenExtraCostCents === null) {
    return explanation;
  }

  if (breakEvenExtraCostCents <= 0) {
    explanation.push(
      "No non-negative extra-trip cost makes a two-shop plan cheaper than the best single shop.",
    );
  } else if (
    winner.stores.length === 1 &&
    enteredExtraStopCostCents === breakEvenExtraCostCents
  ) {
    explanation.push(
      `At the ${formatRm(breakEvenExtraCostCents)} break-even cost, both plans tie, so JimatCart prefers fewer stops.`,
    );
  } else {
    explanation.push(
      `A two-shop plan is cheaper only while the extra stop costs less than ${formatRm(breakEvenExtraCostCents)}.`,
    );
  }

  return explanation;
}

/**
 * Enumerates every complete single-shop plan and unique shop pair, then ranks
 * them by final cost, stop count, and alphabetical store signature.
 *
 * With N items and S shops, runtime is O(N × (S + S²)) and stored candidate
 * assignments use O(N × (S + S²)) space. JimatCart caps S at three, so both
 * simplify to linear growth in the number of basket items.
 */
export function optimizeBasket(input: BasketInput): Recommendation {
  const inputProblem = findInputProblem(input);

  if (inputProblem) {
    return createNoPlan([inputProblem]);
  }

  const candidates: CandidatePlan[] = [];

  for (const store of input.stores) {
    const candidate = buildSingleStoreCandidate(input, store);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  for (let firstIndex = 0; firstIndex < input.stores.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < input.stores.length;
      secondIndex += 1
    ) {
      const candidate = buildTwoStoreCandidate(
        input,
        input.stores[firstIndex],
        input.stores[secondIndex],
      );

      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  if (candidates.length === 0) {
    const itemsUnavailableEverywhere = input.items.filter((item) =>
      input.stores.every((store) => priceAt(item, store) === null),
    );

    if (itemsUnavailableEverywhere.length > 0) {
      return createNoPlan([
        `No price is available at any selected shop for: ${itemsUnavailableEverywhere
          .map((item) => item.name)
          .join(", ")}.`,
      ]);
    }

    return createNoPlan([
      "No complete plan fits the two-shop limit; covering all items would require three shops.",
    ]);
  }

  candidates.sort(compareCandidates);
  const winner = candidates[0];
  const singleStoreCandidates = candidates.filter(
    (candidate) => candidate.stores.length === 1,
  );
  const twoStoreCandidates = candidates.filter(
    (candidate) => candidate.stores.length === 2,
  );
  const bestSingleStoreTotalCents =
    singleStoreCandidates.length > 0
      ? Math.min(
          ...singleStoreCandidates.map(
            (candidate) => candidate.grocerySubtotalCents,
          ),
        )
      : null;
  const cheapestTwoStoreSubtotalCents =
    twoStoreCandidates.length > 0
      ? Math.min(
          ...twoStoreCandidates.map(
            (candidate) => candidate.grocerySubtotalCents,
          ),
        )
      : null;
  const netSavingCents =
    bestSingleStoreTotalCents === null
      ? null
      : bestSingleStoreTotalCents - winner.finalTotalCents;
  const breakEvenExtraCostCents =
    bestSingleStoreTotalCents === null ||
    cheapestTwoStoreSubtotalCents === null
      ? null
      : bestSingleStoreTotalCents - cheapestTwoStoreSubtotalCents;

  return {
    status: "success",
    storesUsed: winner.stores.map((store) => store.id),
    assignments: winner.assignments,
    grocerySubtotalCents: winner.grocerySubtotalCents,
    extraStopCostCents: winner.extraStopCostCents,
    finalTotalCents: winner.finalTotalCents,
    bestSingleStoreTotalCents,
    netSavingCents,
    breakEvenExtraCostCents,
    explanation: explainSuccess(
      winner,
      bestSingleStoreTotalCents,
      netSavingCents,
      breakEvenExtraCostCents,
      input.extraStopCostCents,
    ),
  };
}
