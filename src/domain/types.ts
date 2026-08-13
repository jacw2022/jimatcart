export type MoneyCents = number;

export interface BasketItem {
  id: string;
  name: string;
  quantity: number;
  pricesByStoreId: Record<string, MoneyCents | null>;
}

export interface Store {
  id: string;
  name: string;
}

export interface BasketInput {
  items: BasketItem[];
  stores: Store[];
  extraStopCostCents: MoneyCents;
}

export interface PurchaseAssignment {
  itemId: string;
  storeId: string;
  quantity: number;
  lineTotalCents: MoneyCents;
}

export interface Recommendation {
  status: "success" | "no-valid-plan";
  storesUsed: string[];
  assignments: PurchaseAssignment[];
  grocerySubtotalCents: MoneyCents;
  extraStopCostCents: MoneyCents;
  finalTotalCents: MoneyCents;
  bestSingleStoreTotalCents: MoneyCents | null;
  netSavingCents: MoneyCents | null;
  breakEvenExtraCostCents: MoneyCents | null;
  explanation: string[];
}
