import {
  calculateLineTotalCents,
  formatRm,
  validateItemPriceCents,
  validateTripCostCents,
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
  travelCostCents: MoneyCents;
  finalTotalCents: MoneyCents;
}

const collator = new Intl.Collator("en-MY", {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
});

function compareText(left: string, right: string): number {
  return collator.compare(left, right) ||
    (left < right ? -1 : left > right ? 1 : 0);
}

function compareStores(left: Store, right: Store): number {
  return compareText(left.name, right.name) || compareText(left.id, right.id);
}

function compareStoreLists(left: Store[], right: Store[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const result = compareStores(left[index], right[index]);
    if (result) return result;
  }
  return left.length - right.length;
}

function compareCandidates(left: CandidatePlan, right: CandidatePlan): number {
  return left.finalTotalCents - right.finalTotalCents ||
    left.stores.length - right.stores.length ||
    compareStoreLists(left.stores, right.stores);
}

function addCents(left: number, right: number): number | null {
  const total = left + right;
  return Number.isSafeInteger(total) ? total : null;
}

function planSignature(storeIds: readonly string[]): string {
  return [...storeIds].sort().join("\u0000");
}

function travelCostFor(input: BasketInput, stores: Store[]): number | null {
  const signature = planSignature(stores.map(({ id }) => id));
  return input.tripCosts.find(
    ({ storeIds }) => planSignature(storeIds) === signature,
  )?.costCents ?? null;
}

function priceAt(item: BasketItem, store: Store): MoneyCents | null {
  return item.pricesByStoreId[store.id] ?? null;
}

function buildAssignment(
  item: BasketItem,
  store: Store,
  unitPriceCents: MoneyCents,
): PurchaseAssignment | null {
  const total = calculateLineTotalCents(unitPriceCents, item.quantity);
  return total.ok
    ? {
        itemId: item.id,
        storeId: store.id,
        quantity: item.quantity,
        lineTotalCents: total.cents,
      }
    : null;
}

function finishCandidate(
  input: BasketInput,
  stores: Store[],
  assignments: PurchaseAssignment[],
  grocerySubtotalCents: number,
): CandidatePlan | null {
  const sortedStores = [...stores].sort(compareStores);
  const travelCostCents = travelCostFor(input, sortedStores);
  if (travelCostCents === null) return null;
  const finalTotalCents = addCents(grocerySubtotalCents, travelCostCents);
  return finalTotalCents === null
    ? null
    : {
        stores: sortedStores,
        assignments,
        grocerySubtotalCents,
        travelCostCents,
        finalTotalCents,
      };
}

function buildSingleCandidate(input: BasketInput, store: Store): CandidatePlan | null {
  const assignments: PurchaseAssignment[] = [];
  let subtotal = 0;
  for (const item of input.items) {
    const price = priceAt(item, store);
    if (price === null) return null;
    const assignment = buildAssignment(item, store, price);
    if (!assignment) return null;
    const nextSubtotal = addCents(subtotal, assignment.lineTotalCents);
    if (nextSubtotal === null) return null;
    assignments.push(assignment);
    subtotal = nextSubtotal;
  }
  return finishCandidate(input, [store], assignments, subtotal);
}

function chooseStore(
  item: BasketItem,
  first: Store,
  second: Store,
): { store: Store; price: MoneyCents } | null {
  const firstPrice = priceAt(item, first);
  const secondPrice = priceAt(item, second);
  if (firstPrice === null && secondPrice === null) return null;
  if (firstPrice === null) return { store: second, price: secondPrice! };
  if (secondPrice === null) return { store: first, price: firstPrice };
  if (firstPrice !== secondPrice) {
    return firstPrice < secondPrice
      ? { store: first, price: firstPrice }
      : { store: second, price: secondPrice };
  }
  return compareStores(first, second) <= 0
    ? { store: first, price: firstPrice }
    : { store: second, price: secondPrice };
}

function buildPairCandidate(
  input: BasketInput,
  first: Store,
  second: Store,
): CandidatePlan | null {
  const assignments: PurchaseAssignment[] = [];
  const usedIds = new Set<string>();
  let subtotal = 0;
  for (const item of input.items) {
    const selected = chooseStore(item, first, second);
    if (!selected) return null;
    const assignment = buildAssignment(item, selected.store, selected.price);
    if (!assignment) return null;
    const nextSubtotal = addCents(subtotal, assignment.lineTotalCents);
    if (nextSubtotal === null) return null;
    assignments.push(assignment);
    usedIds.add(selected.store.id);
    subtotal = nextSubtotal;
  }
  return finishCandidate(
    input,
    [first, second].filter(({ id }) => usedIds.has(id)),
    assignments,
    subtotal,
  );
}

function noPlan(explanation: string[]): Recommendation {
  return {
    status: "no-valid-plan",
    storesUsed: [],
    assignments: [],
    grocerySubtotalCents: 0,
    travelCostCents: 0,
    finalTotalCents: 0,
    bestSingleStoreTotalCents: null,
    netSavingCents: null,
    breakEvenTripCostCents: null,
    twoStoreComparison: null,
    explanation,
  };
}

function inputProblem(input: BasketInput): string | null {
  if (input.items.length === 0) return "Add at least one basket item.";
  if (input.stores.length < 1 || input.stores.length > 3) {
    return "Choose between one and three shops.";
  }
  const storeIds = new Set<string>();
  for (const store of input.stores) {
    if (!store.id || !store.name.trim() || storeIds.has(store.id)) {
      return "Every shop must have a unique ID and a name.";
    }
    storeIds.add(store.id);
  }

  const expectedTrips = new Set<string>();
  input.stores.forEach(({ id }) => expectedTrips.add(planSignature([id])));
  for (let first = 0; first < input.stores.length; first += 1) {
    for (let second = first + 1; second < input.stores.length; second += 1) {
      expectedTrips.add(planSignature([input.stores[first].id, input.stores[second].id]));
    }
  }
  const enteredTrips = new Set<string>();
  for (const trip of input.tripCosts) {
    const signature = planSignature(trip.storeIds);
    if (
      enteredTrips.has(signature) ||
      !expectedTrips.has(signature) ||
      !validateTripCostCents(trip.costCents).ok
    ) {
      return "Enter a valid total trip cost for every shop plan.";
    }
    enteredTrips.add(signature);
  }
  if (
    enteredTrips.size !== expectedTrips.size ||
    [...expectedTrips].some((signature) => !enteredTrips.has(signature))
  ) {
    return "Enter a valid total trip cost for every shop plan.";
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

function explain(
  winner: CandidatePlan,
  bestSingle: number | null,
  saving: number | null,
  breakEven: number | null,
  comparedTrip: number | null,
): string[] {
  const names = winner.stores.map(({ name }) => name);
  const lines = [
    winner.stores.length === 1
      ? `Buy everything at ${names[0]}.`
      : `Split the basket between ${names.join(" and ")}.`,
    `Groceries cost ${formatRm(winner.grocerySubtotalCents)}, plus ${formatRm(winner.travelCostCents)} for the estimated trip, for a final total of ${formatRm(winner.finalTotalCents)}.`,
  ];
  if (bestSingle === null) {
    lines.push("No single shop covers every item, so a single-shop comparison is unavailable.");
    return lines;
  }
  if (winner.stores.length === 2 && saving !== null && saving > 0) {
    lines.push(`This plan saves ${formatRm(saving)} against the best single-shop final total of ${formatRm(bestSingle)}.`);
  }
  if (breakEven !== null && breakEven <= 0) {
    lines.push("No non-negative combined-trip cost makes a two-shop plan cheaper than the best single shop.");
  } else if (breakEven !== null && winner.stores.length === 1 && comparedTrip === breakEven) {
    lines.push(`At the ${formatRm(breakEven)} break-even combined-trip cost, both plans tie, so JimatCart prefers fewer shops.`);
  } else if (breakEven !== null) {
    lines.push(`The compared two-shop plan is cheaper only while its combined trip costs less than ${formatRm(breakEven)}.`);
  }
  return lines;
}

/** Enumerates every single shop and unique shop pair in O(items × shops²). */
export function optimizeBasket(input: BasketInput): Recommendation {
  const problem = inputProblem(input);
  if (problem) return noPlan([problem]);
  const candidates: CandidatePlan[] = [];
  input.stores.forEach((store) => {
    const candidate = buildSingleCandidate(input, store);
    if (candidate) candidates.push(candidate);
  });
  for (let first = 0; first < input.stores.length; first += 1) {
    for (let second = first + 1; second < input.stores.length; second += 1) {
      const candidate = buildPairCandidate(input, input.stores[first], input.stores[second]);
      if (candidate) candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    const unavailable = input.items.filter((item) =>
      input.stores.every((store) => priceAt(item, store) === null),
    );
    return unavailable.length
      ? noPlan([`No price is available at any selected shop for: ${unavailable.map(({ name }) => name).join(", ")}.`])
      : noPlan(["No complete plan fits the two-shop limit; covering all items would require three shops."]);
  }

  candidates.sort(compareCandidates);
  const winner = candidates[0];
  const bestSingle = candidates.find(({ stores }) => stores.length === 1) ?? null;
  const bestPair = candidates.find(({ stores }) => stores.length === 2) ?? null;
  const bestSingleTotal = bestSingle?.finalTotalCents ?? null;
  const netSaving = bestSingleTotal === null ? null : bestSingleTotal - winner.finalTotalCents;
  const breakEven = bestSingleTotal === null || bestPair === null
    ? null
    : bestSingleTotal - bestPair.grocerySubtotalCents;
  const twoStoreComparison = bestPair
    ? {
        storeIds: bestPair.stores.map(({ id }) => id),
        grocerySubtotalCents: bestPair.grocerySubtotalCents,
        travelCostCents: bestPair.travelCostCents,
        finalTotalCents: bestPair.finalTotalCents,
      }
    : null;

  return {
    status: "success",
    storesUsed: winner.stores.map(({ id }) => id),
    assignments: winner.assignments,
    grocerySubtotalCents: winner.grocerySubtotalCents,
    travelCostCents: winner.travelCostCents,
    finalTotalCents: winner.finalTotalCents,
    bestSingleStoreTotalCents: bestSingleTotal,
    netSavingCents: netSaving,
    breakEvenTripCostCents: breakEven,
    twoStoreComparison,
    explanation: explain(
      winner,
      bestSingleTotal,
      netSaving,
      breakEven,
      twoStoreComparison?.travelCostCents ?? null,
    ),
  };
}
