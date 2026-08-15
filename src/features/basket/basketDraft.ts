import {
  parseRmInput,
  validateItemPriceCents,
  validateTripCostCents,
} from "../../domain";
import type { BasketInput } from "../../domain";

export interface EditableShop {
  id: string;
  name: string;
}

export interface EditableBasketItem {
  id: string;
  name: string;
  quantityInput: string;
  priceInputsByStoreId: Record<string, string>;
  /** Explicit per-shop Unavailable marks. Missing/false = price expected or entered. */
  unavailableByStoreId: Record<string, boolean>;
}

export interface EditableTripCost {
  storeIds: [string] | [string, string];
  costInput: string;
}

export interface BasketDraft {
  shops: EditableShop[];
  items: EditableBasketItem[];
  tripCosts: EditableTripCost[];
}

export interface BasketDraftErrors {
  general: string[];
  shopNames: Record<string, string>;
  itemNames: Record<string, string>;
  quantities: Record<string, string>;
  prices: Record<string, Record<string, string>>;
  availability: Record<string, string>;
  tripCosts: Record<number, string>;
}

export type BasketDraftResult =
  | { ok: true; input: BasketInput; errors: BasketDraftErrors }
  | { ok: false; errors: BasketDraftErrors };

export const EMPTY_BASKET_DRAFT: BasketDraft = {
  shops: [],
  items: [],
  tripCosts: [],
};

function signature(storeIds: readonly string[]): string {
  return [...storeIds].sort().join("\u0000");
}

export function reconcileTripCosts(
  shops: EditableShop[],
  current: EditableTripCost[],
): EditableTripCost[] {
  const plans: Array<[string] | [string, string]> = shops.map(
    ({ id }) => [id],
  );
  for (let first = 0; first < shops.length; first += 1) {
    for (let second = first + 1; second < shops.length; second += 1) {
      plans.push([shops[first].id, shops[second].id]);
    }
  }
  return plans.map((storeIds) =>
    current.find((trip) => signature(trip.storeIds) === signature(storeIds)) ??
      { storeIds, costInput: "" },
  );
}

function emptyErrors(): BasketDraftErrors {
  return {
    general: [],
    shopNames: {},
    itemNames: {},
    quantities: {},
    prices: {},
    availability: {},
    tripCosts: {},
  };
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase("en-MY");
}

function markDuplicateNames<T extends { id: string; name: string }>(
  values: T[],
  errors: Record<string, string>,
  label: "Shop" | "Item",
): void {
  const idsByName = new Map<string, string[]>();
  for (const value of values) {
    const name = normalizedName(value.name);
    if (!name) {
      errors[value.id] = `${label} name is required.`;
      continue;
    }
    idsByName.set(name, [...(idsByName.get(name) ?? []), value.id]);
  }
  for (const ids of idsByName.values()) {
    if (ids.length > 1) ids.forEach((id) => {
      errors[id] = `${label} names must be unique.`;
    });
  }
}

function hasErrors(errors: BasketDraftErrors): boolean {
  return errors.general.length > 0 ||
    Object.keys(errors.shopNames).length > 0 ||
    Object.keys(errors.itemNames).length > 0 ||
    Object.keys(errors.quantities).length > 0 ||
    Object.keys(errors.availability).length > 0 ||
    Object.keys(errors.tripCosts).length > 0 ||
    Object.values(errors.prices).some((byShop) => Object.keys(byShop).length > 0);
}

/** Converts editable strings to whole quantities and integer cents. */
export function toBasketInput(draft: BasketDraft): BasketDraftResult {
  const errors = emptyErrors();
  if (draft.shops.length < 1 || draft.shops.length > 3) {
    errors.general.push("Add between one and three shops.");
  }
  if (draft.items.length === 0) errors.general.push("Add at least one grocery item.");
  markDuplicateNames(draft.shops, errors.shopNames, "Shop");
  markDuplicateNames(draft.items, errors.itemNames, "Item");

  const tripCosts = reconcileTripCosts(draft.shops, draft.tripCosts).map(
    (trip, index) => {
      const parsed = parseRmInput(trip.costInput);
      let costCents = 0;
      if (!parsed.ok) {
        errors.tripCosts[index] = parsed.error.message;
      } else {
        const ranged = validateTripCostCents(parsed.cents);
        if (!ranged.ok) errors.tripCosts[index] = ranged.error.message;
        else costCents = ranged.cents;
      }
      return { storeIds: trip.storeIds, costCents };
    },
  );

  const items = draft.items.map((item) => {
    const quantityText = item.quantityInput.trim();
    const quantity = /^\d+$/.test(quantityText) ? Number(quantityText) : 0;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      errors.quantities[item.id] = "Quantity must be a whole number from 1 to 99.";
    }

    const pricesByStoreId: Record<string, number | null> = {};
    let hasEnteredPrice = false;
    let hasValidPrice = false;
    for (const shop of draft.shops) {
      const markedUnavailable = Boolean(item.unavailableByStoreId?.[shop.id]);
      const rawPrice = item.priceInputsByStoreId[shop.id] ?? "";
      pricesByStoreId[shop.id] = null;

      if (markedUnavailable) {
        continue;
      }

      if (!rawPrice.trim()) {
        errors.prices[item.id] ??= {};
        errors.prices[item.id][shop.id] =
          "Enter a price or mark Unavailable.";
        continue;
      }

      hasEnteredPrice = true;
      const parsed = parseRmInput(rawPrice);
      if (!parsed.ok) {
        errors.prices[item.id] ??= {};
        errors.prices[item.id][shop.id] = parsed.error.message;
        continue;
      }
      const ranged = validateItemPriceCents(parsed.cents);
      if (!ranged.ok) {
        errors.prices[item.id] ??= {};
        errors.prices[item.id][shop.id] = ranged.error.message;
        continue;
      }
      pricesByStoreId[shop.id] = ranged.cents;
      hasValidPrice = true;
    }
    const itemLabel = item.name.trim() || "this item";
    const allUnavailable =
      draft.shops.length > 0 &&
      draft.shops.every((shop) => Boolean(item.unavailableByStoreId?.[shop.id]));

    if (allUnavailable) {
      errors.availability[item.id] =
        `No selected shop stocks ${itemLabel}. Untick a shop and add a price, or remove this item from the basket.`;
    } else if (draft.shops.length > 0 && !hasEnteredPrice) {
      errors.availability[item.id] =
        "Enter a price at one or more shops, or mark others Unavailable.";
    } else if (hasEnteredPrice && !hasValidPrice) {
      errors.availability[item.id] = "Correct at least one price for this item.";
    }
    return {
      id: item.id,
      name: item.name.trim(),
      quantity,
      pricesByStoreId,
    };
  });

  if (hasErrors(errors)) return { ok: false, errors };
  return {
    ok: true,
    input: {
      stores: draft.shops.map(({ id, name }) => ({ id, name: name.trim() })),
      items,
      tripCosts,
    },
    errors,
  };
}
