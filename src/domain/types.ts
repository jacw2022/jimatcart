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

export interface TripCost {
  storeIds: [string] | [string, string];
  costCents: MoneyCents;
}

export interface BasketInput {
  items: BasketItem[];
  stores: Store[];
  tripCosts: TripCost[];
}

export interface PurchaseAssignment {
  itemId: string;
  storeId: string;
  quantity: number;
  lineTotalCents: MoneyCents;
}

export interface TwoStoreComparison {
  storeIds: string[];
  grocerySubtotalCents: MoneyCents;
  travelCostCents: MoneyCents;
  finalTotalCents: MoneyCents;
}

export interface Recommendation {
  status: "success" | "no-valid-plan";
  storesUsed: string[];
  assignments: PurchaseAssignment[];
  grocerySubtotalCents: MoneyCents;
  travelCostCents: MoneyCents;
  finalTotalCents: MoneyCents;
  bestSingleStoreTotalCents: MoneyCents | null;
  netSavingCents: MoneyCents | null;
  breakEvenTripCostCents: MoneyCents | null;
  twoStoreComparison: TwoStoreComparison | null;
  explanation: string[];
}
