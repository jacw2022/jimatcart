import type { BasketDraft } from "./basketDraft";

export const SAMPLE_BASKET_DRAFT: BasketDraft = {
  shops: [
    { id: "kedai-hijau", name: "Kedai Hijau" },
    { id: "pasar-jimat", name: "Pasar Jimat" },
    { id: "mart-setia", name: "Mart Setia" },
  ],
  items: [
    {
      id: "jasmine-rice",
      name: "Jasmine rice 5 kg",
      quantityInput: "1",
      priceInputsByStoreId: {
        "kedai-hijau": "18.90",
        "pasar-jimat": "20.50",
        "mart-setia": "19.80",
      },
    },
    {
      id: "cooking-oil",
      name: "Cooking oil 1 kg",
      quantityInput: "2",
      priceInputsByStoreId: {
        "kedai-hijau": "7.80",
        "pasar-jimat": "7.20",
        "mart-setia": "7.60",
      },
    },
    {
      id: "eggs",
      name: "Grade B eggs 10-pack",
      quantityInput: "1",
      priceInputsByStoreId: {
        "kedai-hijau": "13.20",
        "pasar-jimat": "12.90",
        "mart-setia": "",
      },
    },
    {
      id: "fresh-milk",
      name: "Fresh milk 1 L",
      quantityInput: "2",
      priceInputsByStoreId: {
        "kedai-hijau": "7.10",
        "pasar-jimat": "7.40",
        "mart-setia": "7.30",
      },
    },
    {
      id: "instant-noodles",
      name: "Instant noodles 5-pack",
      quantityInput: "1",
      priceInputsByStoreId: {
        "kedai-hijau": "5.50",
        "pasar-jimat": "4.90",
        "mart-setia": "",
      },
    },
  ],
  extraStopCostInput: "1.00",
};

export function createSampleBasketDraft(): BasketDraft {
  return structuredClone(SAMPLE_BASKET_DRAFT);
}
