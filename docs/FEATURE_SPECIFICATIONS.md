# JimatCart Feature Specifications

JimatCart is an explainable grocery basket optimiser for Malaysian shoppers. Its MVP answers one question: **does splitting this basket between two shops still save money after the extra trip cost?**

Features are ordered by priority. Both P0 features and the gated P1 enhancement are implemented. P2 and roadmap features remain documentation-only.

## Shared calculation rules

- Use Malaysian ringgit (RM) in the interface and integer cents in calculations.
- Accept whole-number quantities from 1 to 99.
- Accept between one and three candidate shops.
- Consider single-shop plans and plans using at most two shops; never recommend three stops.
- Treat a blank price as “unavailable at this shop,” not RM0.00.
- Accept item prices from RM0.01 to RM9,999.99.
- Accept an incremental second-stop cost from RM0.00 to RM999.99.
- Calculate `lineTotalCents = unitPriceCents * quantity`.
- Add the incremental trip cost only when a plan actually assigns items to two shops.
- Define the break-even extra cost as the best valid single-shop subtotal minus the cheapest valid two-shop grocery subtotal before trip cost.
- If that difference is zero or negative, explain that no non-negative extra-trip cost makes the split cheaper than the best single shop.
- Rank plans by final total, then fewer shops, then the alphabetical store-name signature. Break item-level price ties alphabetically by store name.
- If no single shop covers the basket but a pair does, recommend the pair and state that no single-shop comparison is available.

---

## Feature: P0 — Basket and Price Entry

### Details

Provide one guided workspace where the user can define the basket that will be optimised.

- Start with an illustrative Malaysian sample basket. Let the user clear it through a confirmed reset and build a basket from the empty state.
- Let the user add, rename, and remove one to three shops. Shop names must be non-empty and unique after trimming whitespace and comparing case-insensitively.
- Let the user add, rename, change the quantity of, and remove basket items. Item names must be non-empty and unique by the same comparison rule.
- On desktop, show item quantities and shop prices in a compact comparison table. On small screens, show one item card at a time with a labelled price field for each shop.
- Preserve editable prices as strings so typing never jumps. Normalise valid values on blur and convert them to integer cents only at the domain boundary.
- Treat an empty price cell as unavailable. Label that meaning near the grid and expose it to assistive technology.
- Provide a labelled input for the user’s estimated *additional* cost of visiting a second shop. Explain that the cost can include petrol, fares, parking, or the value they assign to the detour.
- Provide a **Compare my basket** action. If input is incomplete, reveal relevant errors and move focus to the first invalid field; create a recommendation only from valid domain input.
- Show errors beside the relevant field and include a concise error summary when optimisation is blocked.

### User story

As a Malaysian shopper comparing nearby grocery shops, I want to enter my basket, quantities, shop prices, and estimated detour cost so that JimatCart can compare realistic shopping plans.

### Acceptance criteria

- [ ] The user can add, rename, and remove up to three shops.
- [ ] The user can add, edit, and remove any number of basket items, with quantities limited to whole numbers from 1 to 99.
- [ ] The interface rejects blank or duplicate item and shop names, ignoring surrounding whitespace and letter case.
- [ ] Each item has one price field per shop, and a blank price clearly means unavailable.
- [ ] Valid RM input with zero, one, or two decimal places is normalised to two decimal places and stored as integer cents.
- [ ] Prices outside RM0.01–RM9,999.99, malformed values, negative values, and values with more than two decimal places produce an inline error.
- [ ] The extra-stop cost accepts RM0.00–RM999.99 and is stored as integer cents.
- [ ] **Compare my basket** reveals all blocking errors, focuses the first invalid field, and never runs the optimiser with invalid input.
- [ ] Removing a shop also removes its price keys from every item without changing prices entered for other shops.
- [ ] Every input has a visible label, an accessible name, keyboard access, and an error association when invalid.
- [ ] The editor remains usable at 320px width without horizontal page overflow; the desktop price table becomes labelled item cards on small screens.

### Edge cases to cover

- Empty basket, no shops, or both.
- An item name or shop name made only of whitespace.
- Duplicate names such as “Lotus’s” and “ lotus’S ”.
- Quantity 0, 100, a decimal, non-numeric text, or a pasted negative number.
- Prices entered as `5`, `5.5`, `5.50`, `.50`, `0005.50`, or with surrounding spaces.
- Invalid prices such as `5.555`, `RM5.50`, commas, scientific notation, zero, or negative values.
- An item with every price blank, while other items are complete.
- An item available at only one shop.
- Deleting a shop that supplied the only price for one or more items.
- Renaming a shop or item without losing the associated prices.
- Rapid add/remove actions and keyboard-only editing.

---

## Feature: P0 — Explainable Basket Optimizer

### Details

Calculate all valid single-shop and two-shop candidates and present a recommendation that a user can audit.

For each single shop, create a candidate only if it has a price for every item. For each pair of shops, assign each item’s full quantity to the cheaper available shop in the pair. If both prices are equal, use the alphabetically earlier shop. Reject a pair if either shop cannot collectively cover every item. If the assignments use only one member of a pair, normalise the candidate to a single-shop plan and do not add the extra-stop cost.

For each valid candidate, calculate:

- Store-by-store purchase assignments and line totals.
- Grocery subtotal before the incremental trip cost.
- Incremental trip cost: zero for one shop, or the entered value for two shops.
- Final total.
- Best valid single-shop total, when one exists.
- Net saving compared with the best single shop.
- Break-even extra cost based on the cheapest valid two-shop grocery subtotal.

Present the winning recommendation with a plain-language headline such as “Buy everything at Lotus’s” or “Split between Lotus’s and NSK to save RM6.40.” Follow it with a store-by-store list, visible arithmetic, comparison with the best single shop, break-even explanation, assumptions, and warnings about missing comparison data.

The pure domain API is:

```ts
optimizeBasket(input: BasketInput): Recommendation
```

The optimiser must not read from the DOM, React state, `localStorage`, the network, or the current time.

### User story

As a budget-conscious shopper, I want to see the cheapest practical plan and the calculation behind it so that I can decide whether the saving is worth visiting a second shop.

### Acceptance criteria

- [ ] Every valid single shop and every unique shop pair is evaluated.
- [ ] Quantities are included in every line total and all arithmetic uses integer cents.
- [ ] A second-stop cost is added only when assignments use two shops.
- [ ] The selected plan follows the documented tie order: lowest final total, fewer shops, then alphabetical store signature.
- [ ] Equal prices inside a pair are assigned deterministically to the alphabetically earlier shop.
- [ ] The result lists exactly what to buy at each recommended shop, with quantities and line totals.
- [ ] The result shows grocery subtotal, incremental trip cost, final total, and a human-readable explanation.
- [ ] When a valid single-shop plan exists, the result shows its cost and the winning plan’s net saving or additional cost.
- [ ] When a valid two-shop plan exists, the result states the break-even second-stop cost.
- [ ] At exactly the break-even value, the single-shop plan wins because the final totals tie and fewer shops is preferred.
- [ ] When only a pair covers the basket, the pair is recommended and single-shop saving and break-even comparison are shown as unavailable where they cannot be computed meaningfully.
- [ ] When no single shop or pair covers every item, the result uses `no-valid-plan`, names items unavailable everywhere or explains that covering the basket would require three shops, and never displays a misleading total.
- [ ] Changing a price, quantity, shop, item, or trip cost marks an existing result as stale or recalculates it immediately; stale results are never presented as current.

### Edge cases to cover

- One shop is cheapest for every item.
- A split has the lowest grocery subtotal but loses after the trip cost is added.
- A split remains cheaper after the trip cost.
- Trip cost is below, exactly at, and one cent above break-even.
- No single shop covers the basket, but one pair does.
- An item is unavailable at every shop, so no plan exists.
- Three items are each exclusive to a different shop, so the basket would require a prohibited three-stop plan.
- Several shops or pairs have identical final totals.
- The cheapest shop for an item is tied within a pair.
- A pair candidate assigns every item to one shop and must collapse to a one-shop plan.
- Quantities greater than one change which candidate wins.
- RM0.10-style prices remain exact and never expose floating-point artefacts.
- Shop names differ only in punctuation or alphabetical order.
- A basket has one item, one shop, or three candidate shops.

---

## Feature: P1 — Session Persistence and Sample Basket

### Details

After both P0 features pass their tests, save the editable working state to `localStorage`. Restore it on the next visit and provide a Malaysian grocery scenario for demonstrations. Include an explicit reset action with confirmation.

Use a versioned storage envelope so incompatible or corrupted data can be ignored safely. Persist basket inputs, not calculated recommendations; recompute recommendations from current input. The sample should contain at least four items, three recognisable generic shop names, a mixture of unavailable and differing prices, and a detour cost that demonstrates the break-even behaviour.

### User story

As a returning user or evaluator, I want my unfinished comparison restored and an optional sample basket so that I can continue quickly or understand the app without entering all the data manually.

### Acceptance criteria

- [ ] The editable basket draft is saved after changes without blocking typing, including unfinished values.
- [ ] A page refresh restores the latest structurally safe draft and recomputes a current result only when appropriate.
- [ ] Calculated recommendations are recomputed rather than trusted from storage.
- [ ] Resetting non-empty work requires inline confirmation, clears stored data, and returns to an empty basket.
- [ ] From the empty state, the same reset control can restore the sample without overwriting user work.
- [ ] Stored data includes an explicit schema version.
- [ ] Missing, incompatible, or malformed stored data is discarded safely and the app remains usable.
- [ ] Storage failure is non-fatal and produces a concise notice only when the user needs to act.

### Edge cases to cover

- Storage is empty, unavailable, full, or throws a security error.
- Stored JSON is malformed or has an unsupported version.
- Stored values violate current limits or reference a deleted shop.
- React development mode invokes effects more than once.
- The user cancels loading the sample or resetting existing work.
- The sample is loaded, edited, refreshed, and restored correctly.

---

## Feature: P2 — Exportable Shopping Plan

### Details

Allow the user to copy or download the current recommendation as a concise text shopping plan. This feature is optional and must not delay P0 verification or documentation.

The export includes a generated title, store-by-store items and quantities, subtotal, extra-stop cost, final total, comparison, break-even statement, and a note that prices were entered manually. Do not export personal data or raw internal IDs.

### User story

As a shopper leaving home, I want to copy my recommended shopping plan so that I can follow it without reopening the full comparison screen.

### Acceptance criteria

- [ ] Export is available only for a current successful recommendation.
- [ ] The copied and downloaded versions contain the same human-readable information.
- [ ] RM values are formatted to two decimal places.
- [ ] Items are grouped in recommended visit order and include quantities.
- [ ] Copy success and failure are announced accessibly.
- [ ] Changing the basket invalidates the previous export until the recommendation is recalculated.

### Edge cases to cover

- Clipboard permission is denied or the API is unavailable.
- Item or shop names contain punctuation, emoji, or line breaks.
- The result uses only one shop.
- No single-shop comparison exists.
- The recommendation becomes stale immediately before export.

---

## Feature: Future Roadmap — Live Prices and Location-Aware Travel

### Details

Explore replacing manual estimates with retailer price feeds and location-aware detour calculations. This is not part of the internship MVP. It would require a backend, retailer data agreements or permitted integrations, price freshness metadata, location consent, routing, caching, monitoring, and clear fallbacks when data is incomplete.

Every imported price would display its source and “last updated” time. Travel cost would remain user-adjustable because money, time, parking, accessibility, and personal preference cannot be inferred reliably from distance alone.

### User story

As a future JimatCart user, I want current prices and realistic detour estimates so that I can compare shops with less manual entry while retaining control over uncertain assumptions.

### Acceptance criteria

- [ ] No roadmap integration is implemented in the internship MVP.
- [ ] A future design identifies the source, timestamp, confidence, and fallback for every imported price.
- [ ] Location use is opt-in, explained, and minimised.
- [ ] The user can override calculated travel cost.
- [ ] Stale or incomplete external data is visibly distinguished from user-entered data.
- [ ] The optimiser remains deterministic for a captured input snapshot.

### Edge cases to cover

- Retailer data is stale, unavailable, inconsistent, or uses different package sizes.
- A product match is ambiguous across retailers.
- Location permission is denied or an imprecise location is returned.
- Routing or price APIs fail, throttle requests, or change their contract.
- Promotions require memberships, minimum spend, or quantity bundles.
- A calculated detour is geographically short but impractical or inaccessible.
