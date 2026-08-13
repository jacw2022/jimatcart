import type { BasketDraft } from "../features/basket/basketDraft";

export const BASKET_STORAGE_KEY = "jimatcart:basket:v1";

interface StoredWorkspace {
  version: 1;
  draft: BasketDraft;
  hasCompared: boolean;
}

export type LoadWorkspaceResult =
  | { status: "missing" }
  | { status: "restored"; draft: BasketDraft; hasCompared: boolean }
  | { status: "invalid" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDraft(value: unknown): value is BasketDraft {
  if (!isRecord(value) || !Array.isArray(value.shops) || !Array.isArray(value.items)) {
    return false;
  }

  if (typeof value.extraStopCostInput !== "string" || value.shops.length > 3 || value.items.length > 50) {
    return false;
  }

  const shopIds = new Set<string>();
  for (const shop of value.shops) {
    if (!isRecord(shop) || typeof shop.id !== "string" || typeof shop.name !== "string" || !shop.id || shopIds.has(shop.id)) {
      return false;
    }
    shopIds.add(shop.id);
  }

  const itemIds = new Set<string>();
  for (const item of value.items) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.quantityInput !== "string" ||
      !isRecord(item.priceInputsByStoreId) ||
      !item.id ||
      itemIds.has(item.id)
    ) {
      return false;
    }
    itemIds.add(item.id);

    const prices = item.priceInputsByStoreId as Record<string, unknown>;
    const priceKeys = Object.keys(prices);
    if (priceKeys.length !== shopIds.size || priceKeys.some((key) => !shopIds.has(key) || typeof prices[key] !== "string")) {
      return false;
    }
  }

  return true;
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadWorkspace(storage = browserStorage()): LoadWorkspaceResult {
  if (!storage) return { status: "missing" };

  try {
    const raw = storage.getItem(BASKET_STORAGE_KEY);
    if (raw === null) return { status: "missing" };

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      typeof parsed.hasCompared !== "boolean" ||
      !isValidDraft(parsed.draft)
    ) {
      return { status: "invalid" };
    }

    return {
      status: "restored",
      draft: structuredClone(parsed.draft),
      hasCompared: parsed.hasCompared,
    };
  } catch {
    return { status: "invalid" };
  }
}

export function saveWorkspace(
  draft: BasketDraft,
  hasCompared: boolean,
  storage = browserStorage(),
): boolean {
  if (!storage) return false;

  const value: StoredWorkspace = { version: 1, draft, hasCompared };
  try {
    storage.setItem(BASKET_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
