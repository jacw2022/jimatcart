# JimatCart Feature Specifications

## Feature: P0 — Basket and price entry

### Details

Users manage one to three shops and up to 50 grocery items. Each item has a name, a whole-number quantity, and one editable RM unit price per shop. A blank price means unavailable.

### User story

As a shopper, I want to enter my basket and known shop prices quickly so that I can compare realistic totals without a complicated product form.

### Acceptance criteria

- Item quantities are whole numbers from 1 to 99.
- Prices accept RM0.01–RM9,999.99 and convert to integer sen.
- Blank prices are unavailable; at least one valid price is required per item.
- Duplicate or empty shop and item names are rejected.
- Typed strings are preserved while editing.
- Desktop uses a semantic comparison table; mobile uses stacked cards.

### Edge cases to cover

- Empty basket or shop list.
- Invalid, zero, negative, exponent, comma, or over-precision prices.
- Duplicate names and deleted shops.
- Quantity zero, decimals, or values above 99.
- An item unavailable at every shop.

## Feature: P0 — Explainable basket optimiser

### Details

The optimiser enumerates every complete single-shop plan and unique shop pair. An item’s line total is its quantity multiplied by its unit price. Each item’s full quantity is assigned to the cheaper available shop in a pair.

Users enter the total travel estimate for every individual shop and every unique pair. A candidate’s final total is groceries plus the travel estimate for the shops actually used.

### User story

As a shopper, I want to know whether splitting my basket genuinely saves money after travel so that I can choose the lowest complete cost.

### Acceptance criteria

- Every valid single shop and pair is evaluated.
- A nominal pair that assigns everything to one shop uses that shop’s travel cost.
- Plans rank by final total, fewer shops, then alphabetical shop signature.
- Equal unit prices use the alphabetically earlier shop.
- Results show assignments, quantities, line totals, grocery subtotal, travel, final total, best single-shop total, saving, and break-even trip cost.
- At exact break-even, one shop wins.
- When no single shop covers the basket, comparison values are null.

### Edge cases to cover

- Missing prices and unavoidable splits.
- A basket requiring three shops.
- Tied prices and tied plans.
- Quantities above one.
- Travel turning a grocery-saving split into a more expensive plan.
- Missing or invalid travel estimates.

## Feature: P1 — Session persistence and sample basket

### Details

Version-4 local storage saves only the editable draft. The sample basket contains four Malaysian grocery examples, three shops, mixed availability, and complete travel estimates.

### User story

As a returning user, I want my unfinished comparison restored so that I can continue quickly.

### Acceptance criteria

- Unfinished typed values survive refresh.
- Recommendations are recalculated, not persisted.
- Reset requires inline confirmation and can restore the sample from empty state.
- Missing, malformed, incompatible, or blocked storage is non-fatal.

### Edge cases to cover

- Empty, full, blocked, or malformed storage.
- Older schema versions.
- Deleted-shop references.
- Repeated development-mode effects.

## Feature: P2 — Exportable shopping plan

### Details

A current successful result can be copied or downloaded as readable text grouped by shop.

### User story

As a shopper, I want to take the recommended list with me without reopening the full comparison.

### Acceptance criteria

- Export is available only for a current successful recommendation.
- Copy and download contain identical quantities and cost information.
- RM values use two decimal places.
- Clipboard success and failure are announced accessibly.
- Editing invalidates the previous result and export.

### Edge cases to cover

- Clipboard unavailable or denied.
- Punctuation, emoji, or line breaks in names.
- One-shop and unavoidable two-shop results.
