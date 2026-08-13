import {
  parseRmInput,
  validateExtraStopCostCents,
  validateItemPriceCents,
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
}

export interface BasketDraft {
  shops: EditableShop[];
  items: EditableBasketItem[];
  extraStopCostInput: string;
}

export interface BasketDraftErrors {
  general: string[];
  shopNames: Record<string, string>;
  itemNames: Record<string, string>;
  quantities: Record<string, string>;
  prices: Record<string, Record<string, string>>;
  availability: Record<string, string>;
  extraStopCost?: string;
}

export type BasketDraftResult =
  | { ok: true; input: BasketInput; errors: BasketDraftErrors }
  | { ok: false; errors: BasketDraftErrors };

export const EMPTY_BASKET_DRAFT: BasketDraft = {
  shops: [],
  items: [],
  extraStopCostInput: "0.00",
};

function emptyErrors(): BasketDraftErrors {
  return {
    general: [],
    shopNames: {},
    itemNames: {},
    quantities: {},
    prices: {},
    availability: {},
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

  for (const duplicateIds of idsByName.values()) {
    if (duplicateIds.length > 1) {
      for (const id of duplicateIds) {
        errors[id] = `${label} names must be unique.`;
      }
    }
  }
}

function hasErrors(errors: BasketDraftErrors): boolean {
  return (
    errors.general.length > 0 ||
    Object.keys(errors.shopNames).length > 0 ||
    Object.keys(errors.itemNames).length > 0 ||
    Object.keys(errors.quantities).length > 0 ||
    Object.values(errors.prices).some(
      (priceErrors) => Object.keys(priceErrors).length > 0,
    ) ||
    Object.keys(errors.availability).length > 0 ||
    Boolean(errors.extraStopCost)
  );
}

/**
 * Converts raw editable strings into domain cents only after every field has
 * passed syntax and range validation. The draft itself is never normalised or
 * mutated, so typing such as `5.5` remains exactly as entered in the UI.
 */
export function toBasketInput(draft: BasketDraft): BasketDraftResult {
  const errors = emptyErrors();

  if (draft.shops.length < 1 || draft.shops.length > 3) {
    errors.general.push("Add between one and three shops.");
  }

  if (draft.items.length === 0) {
    errors.general.push("Add at least one grocery item.");
  }

  markDuplicateNames(draft.shops, errors.shopNames, "Shop");
  markDuplicateNames(draft.items, errors.itemNames, "Item");

  const extraStopParseResult = parseRmInput(draft.extraStopCostInput);
  let extraStopCostCents = 0;

  if (!extraStopParseResult.ok) {
    errors.extraStopCost = extraStopParseResult.error.message;
  } else {
    const rangeResult = validateExtraStopCostCents(extraStopParseResult.cents);

    if (!rangeResult.ok) {
      errors.extraStopCost = rangeResult.error.message;
    } else {
      extraStopCostCents = rangeResult.cents;
    }
  }

  const items = draft.items.map((item) => {
    let quantity = 0;

    if (!/^\d+$/.test(item.quantityInput.trim())) {
      errors.quantities[item.id] = "Quantity must be a whole number from 1 to 99.";
    } else {
      quantity = Number(item.quantityInput.trim());

      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
        errors.quantities[item.id] =
          "Quantity must be a whole number from 1 to 99.";
      }
    }

    const pricesByStoreId: Record<string, number | null> = {};
    let hasEnteredPrice = false;
    let hasValidPrice = false;

    for (const shop of draft.shops) {
      const rawPrice = item.priceInputsByStoreId[shop.id] ?? "";
      const trimmedPrice = rawPrice.trim();
      pricesByStoreId[shop.id] = null;

      if (!trimmedPrice) {
        continue;
      }

      hasEnteredPrice = true;
      const parseResult = parseRmInput(rawPrice);

      if (!parseResult.ok) {
        errors.prices[item.id] ??= {};
        errors.prices[item.id][shop.id] = parseResult.error.message;
        continue;
      }

      const rangeResult = validateItemPriceCents(parseResult.cents);

      if (!rangeResult.ok) {
        errors.prices[item.id] ??= {};
        errors.prices[item.id][shop.id] = rangeResult.error.message;
        continue;
      }

      pricesByStoreId[shop.id] = rangeResult.cents;
      hasValidPrice = true;
    }

    if (draft.shops.length > 0 && !hasEnteredPrice) {
      errors.availability[item.id] =
        "Enter a price at one or more shops so this item can be compared.";
    } else if (hasEnteredPrice && !hasValidPrice) {
      errors.availability[item.id] =
        "Correct at least one price so this item is available somewhere.";
    }

    return {
      id: item.id,
      name: item.name.trim(),
      quantity,
      pricesByStoreId,
    };
  });

  if (hasErrors(errors)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      stores: draft.shops.map((shop) => ({
        id: shop.id,
        name: shop.name.trim(),
      })),
      items,
      extraStopCostCents,
    },
    errors,
  };
}
