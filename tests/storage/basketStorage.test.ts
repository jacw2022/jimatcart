import { describe, expect, it } from "vitest";
import {
  BASKET_STORAGE_KEY,
  loadWorkspace,
  saveWorkspace,
} from "../../src/storage/basketStorage";
import { createSampleBasketDraft } from "../../src/features/basket/sampleBasket";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("basket storage", () => {
  it("round-trips editable basket state without storing a recommendation", () => {
    const storage = memoryStorage();
    const draft = createSampleBasketDraft();

    expect(saveWorkspace(draft, true, storage)).toBe(true);
    expect(loadWorkspace(storage)).toEqual({
      status: "restored",
      draft,
      hasCompared: true,
    });
    expect(storage.getItem(BASKET_STORAGE_KEY)).not.toMatch(/recommendation/i);
    expect(JSON.parse(storage.getItem(BASKET_STORAGE_KEY)!)).toMatchObject({
      version: 4,
    });
  });

  it.each([
    "not json",
    JSON.stringify({ version: 4, draft: {}, hasCompared: true }),
    JSON.stringify({ version: 3, draft: { shops: [] }, hasCompared: true }),
  ])("rejects malformed or incompatible saved data", (saved) => {
    const storage = memoryStorage();
    storage.setItem(BASKET_STORAGE_KEY, saved);
    expect(loadWorkspace(storage)).toEqual({ status: "invalid" });
  });

  it("does not throw when storage access fails", () => {
    const broken = memoryStorage();
    broken.getItem = () => { throw new DOMException("blocked"); };
    broken.setItem = () => { throw new DOMException("full"); };

    expect(loadWorkspace(broken)).toEqual({ status: "invalid" });
    expect(saveWorkspace(createSampleBasketDraft(), true, broken)).toBe(false);
  });
});
