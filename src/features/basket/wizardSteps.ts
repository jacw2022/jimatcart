import {
  parseRmInput,
  validateItemPriceCents,
  validateTripCostCents,
} from "../../domain";
import type { BasketDraft, BasketDraftErrors } from "./basketDraft";

export const WIZARD_STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "shops", label: "Shops" },
  { id: "items", label: "Items" },
  { id: "trips", label: "Trips" },
  { id: "results", label: "Results" },
] as const;

export type WizardStepIndex = 0 | 1 | 2 | 3 | 4;

export function canAdvanceFromShops(
  draft: BasketDraft,
  errors: BasketDraftErrors,
): boolean {
  return draft.shops.length >= 1 && Object.keys(errors.shopNames).length === 0;
}

export function canAdvanceFromItems(
  draft: BasketDraft,
  errors: BasketDraftErrors,
): boolean {
  if (draft.items.length === 0) return false;
  return (
    Object.keys(errors.itemNames).length === 0 &&
    Object.keys(errors.quantities).length === 0 &&
    Object.keys(errors.availability).length === 0 &&
    !Object.values(errors.prices).some((byShop) => Object.keys(byShop).length > 0)
  );
}

export function canAdvanceFromTrips(draftResultOk: boolean): boolean {
  return draftResultOk;
}

export interface ItemPriceStatus {
  /** Shop-price cells with a valid amount. */
  priced: number;
  /** Non-empty price cells that fail parse or range checks. */
  invalid: number;
  /** Items with no priced shop yet. */
  missing: number;
  unavailable: number;
  totalSlots: number;
  /** Empty cells not marked Unavailable. */
  openSlots: number;
}

function isValidItemPrice(raw: string): boolean {
  const parsed = parseRmInput(raw);
  if (!parsed.ok) return false;
  return validateItemPriceCents(parsed.cents).ok;
}

function isValidTripCost(raw: string): boolean {
  const parsed = parseRmInput(raw);
  if (!parsed.ok) return false;
  return validateTripCostCents(parsed.cents).ok;
}

/** Counts valid prices, invalid entries, unavailable slots, and items still needing any price. */
export function summarizeItemPrices(draft: BasketDraft): ItemPriceStatus {
  let priced = 0;
  let invalid = 0;
  let unavailable = 0;
  let openSlots = 0;
  const totalSlots = draft.items.length * draft.shops.length;
  let itemsNeedingPrice = 0;

  for (const item of draft.items) {
    let itemPriced = 0;
    for (const shop of draft.shops) {
      const markedUnavailable = Boolean(item.unavailableByStoreId?.[shop.id]);
      const raw = item.priceInputsByStoreId[shop.id] ?? "";
      if (markedUnavailable) {
        unavailable += 1;
      } else if (!raw.trim()) {
        openSlots += 1;
      } else if (isValidItemPrice(raw)) {
        priced += 1;
        itemPriced += 1;
      } else {
        invalid += 1;
      }
    }
    if (draft.shops.length > 0 && itemPriced === 0) itemsNeedingPrice += 1;
  }

  return {
    priced,
    invalid,
    missing: itemsNeedingPrice,
    unavailable,
    totalSlots,
    openSlots,
  };
}

export function formatItemsStatusHint(
  draft: BasketDraft,
  errors: BasketDraftErrors,
  stepAttempted: boolean,
): string {
  if (draft.items.length === 0) return "Add at least one grocery item.";

  const status = summarizeItemPrices(draft);
  const ready = canAdvanceFromItems(draft, errors);

  if (ready) {
    const unavailableNote =
      status.unavailable > 0
        ? ` · ${status.unavailable} marked unavailable`
        : "";
    return `${status.priced} price${status.priced === 1 ? "" : "s"} entered${unavailableNote}. Ready for trip costs.`;
  }

  if (stepAttempted) {
    if (Object.keys(errors.availability).length > 0) {
      return `${Object.keys(errors.availability).length} item${Object.keys(errors.availability).length === 1 ? "" : "s"} still need a price at one or more shops.`;
    }
    if (Object.keys(errors.itemNames).length > 0) {
      return "Fix item names before continuing.";
    }
    if (Object.keys(errors.quantities).length > 0) {
      return "Fix quantities before continuing.";
    }
    if (Object.values(errors.prices).some((byShop) => Object.keys(byShop).length > 0)) {
      return "Fix invalid prices before continuing.";
    }
  }

  if (status.invalid > 0) {
    return `${status.priced} of ${status.totalSlots} prices entered · ${status.invalid} need fixing.`;
  }

  if (status.missing > 0) {
    return `${status.missing} item${status.missing === 1 ? "" : "s"} need at least one shop price · ${status.priced} entered · ${status.unavailable} unavailable.`;
  }

  if (status.openSlots > 0) {
    return `Enter prices or mark Unavailable · ${status.priced} of ${status.totalSlots} shop prices filled · ${status.openSlots} still open.`;
  }

  return `Enter prices or mark Unavailable · ${status.priced} of ${status.totalSlots} shop prices filled.`;
}

export interface TripCostStatus {
  total: number;
  entered: number;
  invalid: number;
}

export function summarizeTripCosts(draft: BasketDraft): TripCostStatus {
  const total = draft.tripCosts.length;
  let entered = 0;
  let invalid = 0;
  for (const trip of draft.tripCosts) {
    if (!trip.costInput.trim()) continue;
    if (isValidTripCost(trip.costInput)) entered += 1;
    else invalid += 1;
  }
  return {
    total,
    entered,
    invalid,
  };
}

export function formatTripsStatusHint(
  draft: BasketDraft,
  errors: BasketDraftErrors,
  draftResultOk: boolean,
  stepAttempted: boolean,
): string {
  if (draft.shops.length === 0) return "Add shops before entering trip costs.";

  const status = summarizeTripCosts(draft);

  if (draftResultOk) {
    return `All ${status.total} trip cost${status.total === 1 ? "" : "s"} entered.`;
  }

  if (status.invalid > 0) {
    return `${status.entered} of ${status.total} trip costs entered · ${status.invalid} need fixing.`;
  }

  if (stepAttempted && Object.keys(errors.tripCosts).length > 0) {
    const count = Object.keys(errors.tripCosts).length;
    return `Fix ${count} trip cost${count === 1 ? "" : "s"} before comparing.`;
  }

  const remaining = status.total - status.entered;
  if (remaining > 0) {
    return `${status.entered} of ${status.total} trip costs entered · ${remaining} still needed.`;
  }

  if (Object.keys(errors.shopNames).length > 0 || Object.keys(errors.itemNames).length > 0) {
    return "Fix earlier basket fields before comparing.";
  }

  return `${status.entered} of ${status.total} trip costs entered.`;
}
