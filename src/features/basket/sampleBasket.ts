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
      name: "Jasmine rice",
      quantityInput: "1",
      priceInputsByStoreId: {
        "kedai-hijau": "18.90",
        "pasar-jimat": "19.50",
        "mart-setia": "20.20",
      },
    },
    {
      id: "cooking-oil",
      name: "Cooking oil",
      quantityInput: "2",
      priceInputsByStoreId: {
        "kedai-hijau": "7.80",
        "pasar-jimat": "7.10",
        "mart-setia": "7.60",
      },
    },
    {
      id: "eggs",
      name: "Grade B eggs",
      quantityInput: "1",
      priceInputsByStoreId: {
        "kedai-hijau": "7.00",
        "pasar-jimat": "6.50",
        "mart-setia": "",
      },
    },
    {
      id: "fresh-milk",
      name: "Fresh milk",
      quantityInput: "2",
      priceInputsByStoreId: {
        "kedai-hijau": "7.10",
        "pasar-jimat": "6.95",
        "mart-setia": "7.30",
      },
    },
  ],
  tripCosts: [
    { storeIds: ["kedai-hijau"], costInput: "1.00" },
    { storeIds: ["pasar-jimat"], costInput: "2.50" },
    { storeIds: ["mart-setia"], costInput: "4.00" },
    { storeIds: ["kedai-hijau", "pasar-jimat"], costInput: "3.00" },
    { storeIds: ["kedai-hijau", "mart-setia"], costInput: "5.00" },
    { storeIds: ["pasar-jimat", "mart-setia"], costInput: "4.50" },
  ],
};

export function createSampleBasketDraft(): BasketDraft {
  return structuredClone(SAMPLE_BASKET_DRAFT);
}
