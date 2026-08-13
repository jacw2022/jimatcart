# JimatCart

JimatCart is an explainable grocery basket optimiser for Malaysian shoppers. It compares prices across one to three nearby shops and answers a practical question: does a two-shop split still save money after the extra cost of making another stop?

Prices are entered manually, calculations use integer sen, and every result shows the store-by-store shopping list and arithmetic behind the recommendation.

## What it does

- Edit one to three shops and a grocery basket with whole-number quantities.
- Enter unit prices in RM; a blank price means the product is unavailable there.
- Compare every complete one-shop and two-shop plan.
- Include the estimated incremental cost of petrol, fares, parking, or the detour itself only when two shops are actually used.
- Explain the final total, best single-shop comparison, saving or extra cost, and break-even trip cost.
- Resolve equal-cost plans predictably by preferring fewer shops and then alphabetical shop order.
- Save unfinished input locally, recover it after refresh, and safely ignore damaged saved data.
- Start with a Malaysian sample basket that demonstrates the full workflow.

## Run locally

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

Useful commands:

```bash
npm test          # run the Vitest suite once
npm run test:watch
npm run build     # type-check and create the production build
npm run preview   # preview the production build
```

## How to use it

1. Review the sample basket or replace its shops, items, quantities, and prices.
2. Leave a price blank when an item is unavailable at that shop.
3. Enter only the *additional* cost of making a second stop.
4. Select **Compare my basket**.
5. Read the recommended shops, item assignments, totals, and break-even explanation.

Valid prices contain digits and at most two decimal places, without `RM`, commas, negatives, or exponent notation. Item prices must be RM0.01–RM9,999.99; the second-stop cost may be RM0.00–RM999.99.

## Architecture

```text
src/
├── domain/             Pure types, RM utilities, validation, and optimiser
├── features/
│   ├── basket/         Controlled basket editor and sample data
│   ├── errors/         Last-resort application error boundary
│   └── recommendation/ Explainable result presentation
├── storage/            Versioned, defensive localStorage adapter
└── test/               Shared browser-like test setup
tests/                  Domain and storage unit tests
```

`optimizeBasket(input)` is pure: it does not depend on React, browser storage, time, or the network. With at most three stores it directly enumerates every single store and unique pair, assigns each whole item quantity to the cheaper available store, rejects incomplete candidates, and sorts valid plans deterministically. For `S` stores and `I` items, its bounded running time is `O(S² × I)` and space is `O(S² × I)` for the candidate assignments.

Editable RM text is kept as text while the user types. At the domain boundary, strict parsing converts it digit-by-digit into integer cents; normal typing errors are represented as validation results rather than thrown exceptions. `Intl.NumberFormat` is used only to display RM values.

## Quality checks

The automated suite covers money parsing and multiplication, every one- and two-shop combination, quantities, unavailable items, deterministic ties, break-even boundaries, unavoidable splits, no-plan states, UI editing and validation, local restoration, corrupted data, and an independent exhaustive optimiser oracle.

The interface uses semantic landmarks and a real comparison table on desktop. Below 720px it switches to labelled item cards without horizontal page overflow. Controls have visible labels and focus states, errors are associated with their fields, and result updates use a restrained live region without stealing focus. The full flow has been checked in Chromium at desktop size and at 320px width with no console errors.

## Scope and limitations

JimatCart has no backend, accounts, retailer integration, scraping, maps, or external API. It does not verify stock, package equivalence, promotions, loyalty pricing, or the accuracy of manually entered prices. Each item's full quantity is bought from one shop, and a recommendation uses no more than two shops.

Future work could add an exportable shopping list and carefully sourced live-price or route data, but those features are intentionally outside this internship MVP.

## Three-minute demo

1. Open the app and introduce the sample basket and blank-as-unavailable convention.
2. Point out the editable shops, quantities, unit prices, and RM1.00 incremental trip estimate.
3. Select **Compare my basket** and walk through the store assignments and visible calculation.
4. Change the trip cost to the displayed break-even amount, compare again, and show that the one-shop plan wins an exact tie.
5. Refresh to demonstrate local restoration, then use **Reset basket** to show the safe reset flow.

Detailed product and feature decisions are in [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) and [FEATURE_SPECIFICATIONS.md](docs/FEATURE_SPECIFICATIONS.md).
