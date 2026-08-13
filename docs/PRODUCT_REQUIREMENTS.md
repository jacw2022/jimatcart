# JimatCart Product Requirements

## 1. App’s purpose

JimatCart helps a shopper determine whether splitting a grocery basket between two shops genuinely saves money after accounting for the additional trip cost.

It does not attempt to predict the universally “best” shopping trip. It produces an auditable recommendation from prices and assumptions supplied by the user, exposes the arithmetic, and states where comparison is not possible.

## 2. Context

Malaysian university students are the primary MVP audience; the same workflow can also help budget-conscious households. They often compare prices between supermarkets, mini markets, and wet markets. One shop may be cheaper for staples while another is cheaper for fresh or household items. Comparing item prices alone can exaggerate the saving because a second stop adds petrol, public-transport fare, parking, time, or inconvenience.

JimatCart treats that detour as an explicit incremental cost. The user remains in control of the estimate rather than receiving an unexplained value. Manual entry is intentional for the MVP: it keeps the data source clear, makes the core workflow achievable, and avoids unreliable scraping or retailer dependencies.

### Target user

A shopper in Malaysia who:

- Has a specific grocery basket.
- Can obtain or estimate prices from one to three nearby shops.
- Wants to know the cheapest complete plan.
- May visit a second shop only when the net saving is worthwhile.
- Values a transparent calculation more than a black-box recommendation.

### Core user need

> “Tell me where to buy each item, what the complete trip will cost, and whether the saving justifies another stop.”

## 3. Goals and success measures

### Product goals

1. Complete one basket-to-recommendation workflow without requiring an account or setup guide.
2. Produce correct, deterministic one- and two-shop comparisons.
3. Make every recommendation understandable from the visible calculation.
4. Handle incomplete data honestly instead of producing partial or misleading totals.
5. Demonstrate responsible engineering through simple architecture, verification, and explicit limitations.

### Measurable success criteria

- A first-time evaluator can load a sample or enter a small basket and understand the recommendation within three minutes.
- Every successful recommendation lists a complete assignment for every basket item.
- Domain tests cover all documented calculation rules and boundaries.
- An independent exhaustive oracle agrees with the optimiser for the bounded generated scenarios.
- The result changes correctly below, at, and above the break-even trip cost.
- The complete P0 flow is usable with a keyboard and at 320px viewport width.
- A fresh install, test run, production build, and local preview complete without errors.
- The project documents its calculation rules, verification, assumptions, and known limitations clearly.

## 4. Non-goals and MVP boundaries

The internship MVP will not include:

- Authentication, profiles, or cloud synchronisation.
- A backend, database, or server-side API.
- Retailer scraping or live price feeds.
- Maps, GPS, route optimisation, or automatic travel-cost calculation.
- Stock guarantees, loyalty prices, coupons, bundles, or promotion engines.
- Price history, notifications, or recurring baskets.
- More than three candidate shops or recommendations using more than two shops.
- Multiple currencies or locale switching.
- Native mobile or desktop applications.
- Analytics, advertising, decorative dashboards, or gamification.

P1 was implemented only after P0 was complete and verified. P2 and roadmap items remain outside the submitted application.

## 5. Feature priorities

| Priority | Feature | Required outcome |
|---|---|---|
| P0 | Basket and Price Entry | Capture valid items, quantities, shop prices, availability, and incremental trip cost. |
| P0 | Explainable Basket Optimizer | Return a deterministic complete plan with visible arithmetic, comparison, and break-even explanation. |
| P1 | Session Persistence and Sample Basket | Restore valid local input and provide a safe demonstration scenario. |
| P2 | Exportable Shopping Plan | Copy or download the current recommendation as readable text. |
| Roadmap | Live Prices and Location-Aware Travel | Planning only; no MVP implementation. |

Detailed user stories, acceptance criteria, and edge cases are defined in `FEATURE_SPECIFICATIONS.md`.

## 6. Primary user journey

1. The user lands on a single page and reads the one-sentence purpose.
2. The user reviews the included sample basket or replaces it with one to three shops and their own items.
3. The user adds grocery items and whole-number quantities.
4. The user enters each shop’s unit price. A blank field means that item is unavailable at that shop.
5. The user estimates the *additional* cost of making a second stop.
6. The interface identifies invalid values or items unavailable everywhere.
7. The user selects **Compare my basket**; invalid input reveals clear errors and focuses the first invalid field.
8. JimatCart displays the recommended shop or pair, store-by-store purchases, full cost breakdown, comparison, and break-even statement.
9. The user changes the trip estimate or a price and sees a current recalculation or an explicit stale state.
10. The user can refresh and continue from the locally restored draft, or reset it with confirmation.

## 7. UI and UX requirements

### Information architecture

Use one page with four clear regions:

1. **Header:** product name and purpose.
2. **Basket workspace:** shops, items, quantities, price comparison, and trip-cost input.
3. **Recommendation:** result headline, assignments, cost breakdown, explanation, and warnings.
4. **Assumptions/footer:** manual-price reminder and scope limitations.

Do not add onboarding screens, dashboard navigation, account controls, or unrelated metrics.

### Layout

- Desktop: show a compact semantic table with rows for items and columns for quantity and each shop. Place the recommendation alongside the editor only when enough width remains; otherwise place it directly below.
- Mobile below approximately 720px: replace the comparison table with stacked item cards. Repeat visible shop labels inside every card and avoid page-level horizontal scrolling.
- Minimum supported width: 320px.
- Keep the primary action after the required inputs in reading and tab order.
- Use progressive disclosure for detailed assumptions, but never hide the final arithmetic.

### Visual direction

- Practical Malaysian consumer product, not a corporate analytics dashboard.
- Dark green headings and primary actions, mid-green highlights, pale green result surfaces, neutral backgrounds, amber warnings, and red errors.
- System sans-serif typography and strong visual hierarchy.
- All displayed money follows `RM1,234.56` formatting.
- Savings use clear language and sign: “Save RM6.40” or “Costs RM2.10 more.”
- No excessive animation, decorative charts, confetti, or colour-only meaning.

### Required interface states

- Empty basket.
- Partially complete input.
- Inline validation error.
- Item unavailable at one shop.
- Item unavailable everywhere.
- Optimisation ready.
- Successful one-shop recommendation.
- Successful saving split recommendation.
- Split required because no single shop covers the basket.
- No valid plan.
- Current result recomputed after valid input changes or hidden while input is invalid.
- Storage restored, failed, or safely discarded.
- Sample and reset confirmation.

### Accessibility

- Use semantic landmarks, headings, buttons, form controls, and a real desktop table.
- Give every input a visible label and accessible name.
- Programmatically connect errors and help text to controls.
- Maintain visible focus, logical keyboard order, and adequate touch targets.
- Announce status changes through restrained live regions.
- Do not move keyboard focus unexpectedly when displaying a result.
- Meet accessible colour contrast and do not communicate state by colour alone.
- Respect reduced-motion preferences.

## 8. Technical requirements

### Stack

- React and TypeScript.
- Vite.
- Vitest and React Testing Library.
- Semantic HTML and plain CSS.
- Versioned `localStorage` for P1.
- `Intl.NumberFormat` with Malaysian ringgit for display only.

No backend is required. In the MVP, “backend logic” means the pure TypeScript domain and local persistence layers.

### Architecture principles

- Keep optimisation, money parsing, and domain validation outside React components.
- Keep `optimizeBasket` pure and deterministic.
- Keep display strings separate from stored integer money.
- Generate stable IDs independent of names and array positions.
- Save only inputs to local storage; recompute recommendations.
- Prefer direct bounded enumeration to a general-purpose optimisation dependency.
- Add no dependency without a specific, documented need.

### Conceptual interfaces

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

interface BasketInput {
  items: BasketItem[];
  stores: Store[];
  extraStopCostCents: MoneyCents;
}

interface PurchaseAssignment {
  itemId: string;
  storeId: string;
  quantity: number;
  lineTotalCents: MoneyCents;
}

interface Recommendation {
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

function optimizeBasket(input: BasketInput): Recommendation;
```

For a `no-valid-plan` result, stores and assignments are empty, monetary totals are zero, and unavailable comparisons are null. `explanation` identifies items unavailable everywhere or states that the basket would require three shops. The UI must not interpret zero placeholders as a valid price.

### Input constraints

| Input | Rule |
|---|---|
| Item name | Required, trimmed, unique case-insensitively. |
| Shop name | Required, trimmed, unique case-insensitively. |
| Quantity | Whole number from 1 to 99. |
| Item price | Blank for unavailable, otherwise RM0.01–RM9,999.99 with no more than two decimals. |
| Shops | One to three candidates. |
| Extra-stop cost | RM0.00–RM999.99 with no more than two decimals. |

Reject currency symbols, commas, negatives, exponent notation, and more than two decimal places. Parsing must not use floating-point multiplication.

## 9. Optimizer behaviour

### Candidate generation

1. Validate structural input.
2. Create a candidate for every shop that carries every item.
3. Create a candidate for every unique pair of shops that collectively carries every item.
4. Within a pair, assign an item’s full quantity to the cheaper available shop.
5. For tied item prices, use the alphabetically earlier shop name.
6. Collapse a pair candidate to a single-shop candidate if all assignments use one shop.
7. Calculate each line total as integer unit-price cents multiplied by quantity.
8. Add the incremental trip cost only when two shops are used.

### Ranking

Sort valid candidates by:

1. Lowest final total.
2. Fewer shops.
3. Alphabetically sorted store-name signature.

This makes results deterministic and ensures a one-shop plan wins at exact break-even.

### Comparison values

- `bestSingleStoreTotalCents`: lowest complete one-shop subtotal, or null if none exists.
- Cheapest two-shop grocery subtotal: the lowest subtotal before trip cost among candidates that actually use two shops.
- `breakEvenExtraCostCents`: best single total minus cheapest two-shop grocery subtotal when both exist. A zero or negative value means no allowed non-negative extra-trip cost makes the split cheaper, so the UI explains that no useful threshold exists.
- `netSavingCents`: best single total minus the winning final total, when a valid single comparison exists. Positive means saving; zero means tied; negative means more expensive.

If no single shop covers the basket, recommend a valid pair but explain that comparison and break-even values requiring a one-shop baseline are unavailable.

## 10. Data handling and persistence

Editable state lives in controlled React state and is stored in a versioned local envelope:

```ts
interface StoredBasketV1 {
  version: 1;
  draft: BasketDraft;
  hasCompared: boolean;
}
```

On restoration:

1. Read defensively; storage access may throw.
2. Parse JSON safely.
3. Require the supported version.
4. Validate names, bounds, IDs, and price references.
5. Discard invalid data and fall back to the sample basket with a concise notice.
6. Recompute any recommendation from validated input.

Never persist generated results as authoritative, and never allow storage failure to block the core workflow.

## 11. Testing and correctness strategy

### Unit tests

- Money parsing, formatting, limits, and exact multiplication.
- Every valid single-shop and unique two-shop combination.
- Missing prices and uncovered items.
- Quantities greater than one.
- Item and plan ties.
- Pair collapsing to one shop.
- Trip cost below, at, and above break-even.
- A pair that loses after cost and a pair that still wins.
- An unavoidable pair and no-valid-plan result.
- A basket whose items are individually available but collectively require three shops.
- Deterministic explanation inputs and result ordering.

### Independent verification

Build a test-only oracle that enumerates every allowed item assignment for small deterministic baskets. It must not reuse production candidate or ranking helpers. Compare its result with `optimizeBasket`, and retain explicit regression tests for any discrepancy found.

### Component and flow tests

- Add, edit, and remove shops and items.
- Enter prices, mark products unavailable, and change quantity.
- Block optimisation for invalid or uncovered input.
- Complete the input-to-recommendation flow.
- Display correct assignments, totals, comparison, and break-even value.
- Invalidate or recalculate results after input changes.
- Restore, reject, sample, and reset P1 state if implemented.

### Manual checks

- Keyboard-only use from empty state to recommendation.
- Visible focus, field labels, errors, live announcements, and logical reading order.
- 320px, 720px, and desktop layouts, including long names and visible errors.
- Fresh install, full test suite, production build, and preview.
- No browser-console errors.

## 12. Assumptions and limitations

- Prices are manually entered and may be stale or incorrect.
- The user’s incremental trip-cost estimate is subjective.
- Each item’s full quantity is bought from one shop; quantities are not split across shops.
- Package sizes and product variants are assumed comparable because the user selects them.
- Stock, promotions, memberships, minimum spends, and bulk discounts are excluded.
- The optimiser considers no more than three candidates and recommends no more than two shops.
- A lower monetary total may not reflect accessibility, time, product preference, or convenience.
- The app assists a decision; it does not guarantee real-world savings.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Misleading result from incomplete prices | Require every item to be available somewhere and never show partial totals. |
| Floating-point money errors | Parse and calculate exclusively in integer cents. |
| User distrust in a black-box answer | Show assignments, arithmetic, comparison, assumptions, and break-even value. |
| Extra features weaken core quality | Gate P1 behind passing P0 checks; keep P2 and roadmap optional. |
| Unnecessary complexity or hidden defects | Keep domain logic small, use direct enumeration, and verify it with independent tests. |
| Saved data becomes incompatible | Version, validate, and safely discard local storage. |
| Mobile price grid becomes unusable | Use labelled stacked item cards below the desktop breakpoint. |

## 14. Future validation before roadmap implementation

Before adding live data or location features, validate:

- Whether users will enter prices manually and understand the detour estimate.
- Which retailers can provide permitted, reliable, product-level data.
- How products and package sizes can be matched accurately.
- How often prices must be refreshed and how freshness affects trust.
- Whether users prefer money-only travel cost or separate time and convenience controls.
- What location precision is actually necessary and acceptable.
- Operational, privacy, legal, and maintenance costs of retailer and routing integrations.

The future solution must preserve manual overrides, source and freshness indicators, deterministic captured inputs, and the local MVP workflow when external services fail.
