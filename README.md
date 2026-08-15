# JimatCart

JimatCart is an explainable grocery basket optimiser for Malaysian shoppers. It compares buying everything at one nearby shop with splitting the basket between two shops, including the total travel estimate for each plan.

## How it works

1. Add one to three shops.
2. Add groceries and a whole-number quantity from 1 to 99.
3. Enter the unit price at each shop. Leave a price blank when unavailable.
4. Enter the total estimated travel cost for each individual shop and shop pair.
5. Select **Compare my basket**.
6. Review the store assignments, grocery subtotal, travel estimate, final total, saving, and break-even combined-trip cost.

All RM values are converted to integer sen before calculation. For each item:

```text
line total = quantity × unit price
```

The optimiser checks every valid single-shop and two-shop plan. Plans are ranked by final cost, fewer shops, then alphabetical shop order. At an exact tie, one shop wins.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Test and build

```bash
npm test
npm run build
```

## Architecture

```text
src/
├── components/        Shared interface controls
├── domain/            Pure money and optimiser logic
├── features/
│   ├── basket/        Controlled shop, price, and trip-cost editors
│   └── recommendation Recommendation and shopping-plan export
└── storage/           Defensive version-4 localStorage adapter
```

The pure optimiser has no React, browser-storage, time, or network dependency. Editable strings stay untouched while typing and are converted only at the domain boundary. Recommendations are recalculated rather than trusted from storage.

## Scope

JimatCart has no backend, accounts, maps, route calculation, live retailer prices, scraping, or external APIs. Prices, availability, and travel estimates are entered manually. The app does not verify brand, quality, stock, promotions, or travel time.
