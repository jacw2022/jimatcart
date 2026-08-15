import type { BasketDraft } from "../features/basket/basketDraft";

export const BASKET_STORAGE_KEY = "jimatcart:basket:v4";

interface StoredWorkspace {
  version: 4;
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

function planSignature(storeIds: string[]): string {
  return [...storeIds].sort().join("\u0000");
}

function isValidDraft(value: unknown): value is BasketDraft {
  if (
    !isRecord(value) ||
    !Array.isArray(value.shops) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.tripCosts) ||
    value.shops.length > 3 ||
    value.items.length > 50
  ) {
    return false;
  }

  const shopIds = new Set<string>();
  for (const shop of value.shops) {
    if (
      !isRecord(shop) ||
      typeof shop.id !== "string" ||
      typeof shop.name !== "string" ||
      !shop.id ||
      shopIds.has(shop.id)
    ) {
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

    const prices = item.priceInputsByStoreId;
    if (
      Object.keys(prices).length !== shopIds.size ||
      Object.keys(prices).some((shopId) => !shopIds.has(shopId)) ||
      Object.values(prices).some((price) => typeof price !== "string")
    ) {
      return false;
    }

    if (item.unavailableByStoreId !== undefined) {
      if (!isRecord(item.unavailableByStoreId)) return false;
      for (const [shopId, flag] of Object.entries(item.unavailableByStoreId)) {
        if (!shopIds.has(shopId) || typeof flag !== "boolean") return false;
      }
    }
  }

  const expectedPlans = new Set<string>();
  const ids = [...shopIds];
  ids.forEach((id) => expectedPlans.add(planSignature([id])));
  for (let first = 0; first < ids.length; first += 1) {
    for (let second = first + 1; second < ids.length; second += 1) {
      expectedPlans.add(planSignature([ids[first], ids[second]]));
    }
  }

  const enteredPlans = new Set<string>();
  for (const trip of value.tripCosts) {
    if (
      !isRecord(trip) ||
      !Array.isArray(trip.storeIds) ||
      (trip.storeIds.length !== 1 && trip.storeIds.length !== 2) ||
      trip.storeIds.some(
        (id) => typeof id !== "string" || !shopIds.has(id),
      ) ||
      new Set(trip.storeIds).size !== trip.storeIds.length ||
      typeof trip.costInput !== "string"
    ) {
      return false;
    }
    const signature = planSignature(trip.storeIds as string[]);
    if (enteredPlans.has(signature)) return false;
    enteredPlans.add(signature);
  }

  return (
    enteredPlans.size === expectedPlans.size &&
    [...expectedPlans].every((signature) => enteredPlans.has(signature))
  );
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function normalizeDraft(draft: BasketDraft): BasketDraft {
  return {
    ...draft,
    items: draft.items.map((item) => {
      const rawFlags = (item as { unavailableByStoreId?: unknown })
        .unavailableByStoreId;
      return {
        ...item,
        unavailableByStoreId: isRecord(rawFlags)
          ? Object.fromEntries(
              Object.entries(rawFlags).filter(
                (entry): entry is [string, true] => entry[1] === true,
              ),
            )
          : {},
      };
    }),
  };
}

export function loadWorkspace(storage = browserStorage()): LoadWorkspaceResult {
  if (!storage) return { status: "missing" };
  try {
    const raw = storage.getItem(BASKET_STORAGE_KEY);
    if (raw === null) return { status: "missing" };
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== 4 ||
      typeof parsed.hasCompared !== "boolean" ||
      !isValidDraft(parsed.draft)
    ) {
      return { status: "invalid" };
    }
    return {
      status: "restored",
      draft: normalizeDraft(structuredClone(parsed.draft)),
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
  const value: StoredWorkspace = { version: 4, draft, hasCompared };
  try {
    storage.setItem(BASKET_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
