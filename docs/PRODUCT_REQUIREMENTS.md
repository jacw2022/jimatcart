# JimatCart Product Requirements

## Purpose

JimatCart determines whether a grocery basket is cheapest at one familiar shop or split across two shops after accounting for quantities, manually entered prices, and total travel estimates.

## Context

Malaysian students and budget-conscious households may compare nearby shops but cannot easily tell whether a second shop remains worthwhile after travel. JimatCart provides a small, auditable calculator rather than live-price or route claims.

## Goals

- Let a first-time user complete a comparison without instructions.
- Calculate every total using integer sen.
- Explain the selected stores, item assignments, travel, saving, and break-even point.
- Remain keyboard-accessible and usable at 320 px.
- Preserve unfinished work locally and provide a quick demonstration basket.

## Non-goals

- Live retailer data, product matching, maps, route ordering, scraping, or APIs.
- Authentication, accounts, server storage, or a database.
- Brand, quality, promotion, loyalty, stock, or travel-time verification.

## Primary workflow

1. Add one to three shops.
2. Add each grocery name and quantity.
3. Enter one unit price per shop, leaving unavailable prices blank.
4. Enter total travel estimates for each shop and pair.
5. Compare the basket.
6. Review or export the recommended shopping plan.

## Domain model

```ts
type MoneyCents = number;

interface BasketItem {
  id: string;
  name: string;
  quantity: number;
  pricesByStoreId: Record<string, MoneyCents | null>;
}

interface Store {
  id: string;
  name: string;
}

interface TripCost {
  storeIds: [string] | [string, string];
  costCents: MoneyCents;
}

interface BasketInput {
  items: BasketItem[];
  stores: Store[];
  tripCosts: TripCost[];
}

interface PurchaseAssignment {
  itemId: string;
  storeId: string;
  quantity: number;
  lineTotalCents: MoneyCents;
}
```

The public domain interface is:

```ts
optimizeBasket(input: BasketInput): Recommendation
```

## Calculation rules

- Quantity is a whole number from 1 to 99.
- Item price is RM0.01–RM9,999.99.
- Travel cost is RM0.00–RM999.99.
- Line total equals quantity multiplied by unit price.
- Empty price means unavailable.
- At most two shops may be recommended.
- Pair assignments choose the cheaper available unit price; equal prices prefer the alphabetically earlier shop.
- Final total equals grocery subtotal plus the total travel estimate for the shops used.
- Plans rank by final total, fewer shops, then alphabetical shop signature.
- Break-even pair travel equals best single-shop final total minus pair grocery subtotal.
- At exact break-even, the single shop wins.

## Interface requirements

- React, TypeScript, semantic HTML, and plain CSS.
- Controlled inputs preserve incomplete typing.
- Desktop uses a compact comparison table.
- Below 720 px, items become stacked cards with visible shop labels and no page overflow.
- Every input has a visible or programmatic label, errors are associated with fields, focus is visible, and result changes are announced without stealing focus.
- The primary action has loading feedback and stale results disappear immediately after an edit.

## Persistence and export

The version-4 local-storage envelope contains editable draft state only. Structural validation rejects incompatible or corrupted data. A restored draft requires a fresh comparison.

A current successful recommendation can be copied or downloaded. The text groups quantities and line totals by shop and includes grocery subtotal, travel estimate, final total, comparison, break-even explanation, and a manual-data warning.

## Testing strategy

- Exact RM parsing and integer line totals.
- Every single-shop and unique pair combination.
- Quantities above one, unavailable prices, ties, unavoidable splits, and three-shop failures.
- Travel estimates below, at, and above break-even.
- Corrupted persistence and clipboard failure.
- User workflow, stale-result invalidation, keyboard labels, and responsive layout.
- Clean production TypeScript build.

## Risks and assumptions

Prices and travel costs may be stale or inaccurate. Items entered under the same name may differ in size or quality; the basic MVP deliberately treats each entered price as one comparable unit. The interface makes this assumption visible rather than adding product-detail fields that slow down the core comparison.
