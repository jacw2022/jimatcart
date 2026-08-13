import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  optimizeBasket,
  parseRmInput,
  validateExtraStopCostCents,
  validateItemPriceCents,
} from "../../domain";
import { loadWorkspace, saveWorkspace } from "../../storage/basketStorage";
import { RecommendationView } from "../recommendation/RecommendationView";
import {
  EMPTY_BASKET_DRAFT,
  toBasketInput,
} from "./basketDraft";
import { createSampleBasketDraft } from "./sampleBasket";
import type {
  BasketDraft,
  BasketDraftResult,
  EditableBasketItem,
  EditableShop,
} from "./basketDraft";

function shopNameKey(shopId: string): string {
  return `shop:${shopId}:name`;
}

function itemNameKey(itemId: string): string {
  return `item:${itemId}:name`;
}

function quantityKey(itemId: string): string {
  return `item:${itemId}:quantity`;
}

function priceKey(itemId: string, shopId: string): string {
  return `item:${itemId}:price:${shopId}`;
}

function shopDisplayName(shop: EditableShop, index: number): string {
  return shop.name.trim() || `Shop ${index + 1}`;
}

function itemDisplayName(item: EditableBasketItem, index: number): string {
  return item.name.trim() || `Item ${index + 1}`;
}

interface FieldErrorProps {
  id: string;
  message?: string;
  visible: boolean;
}

interface InitialWorkspace {
  draft: BasketDraft;
  hasCompared: boolean;
  restoreNotice?: string;
}

let fallbackId = 0;

function createId(prefix: "shop" | "item"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  fallbackId += 1;
  return `${prefix}-local-${fallbackId}`;
}

function createEmptyBasketDraft(): BasketDraft {
  return structuredClone(EMPTY_BASKET_DRAFT);
}

function getInitialWorkspace(): InitialWorkspace {
  const saved = loadWorkspace();

  if (saved.status === "restored") {
    return { draft: saved.draft, hasCompared: saved.hasCompared };
  }

  return {
    draft: createSampleBasketDraft(),
    hasCompared: true,
    restoreNotice:
      saved.status === "invalid"
        ? "Saved basket data could not be restored, so the sample basket was loaded instead."
        : undefined,
  };
}

function countErrors(errors: BasketDraftResult["errors"]): number {
  return (
    errors.general.length +
    Object.keys(errors.shopNames).length +
    Object.keys(errors.itemNames).length +
    Object.keys(errors.quantities).length +
    Object.values(errors.prices).reduce(
      (total, priceErrors) => total + Object.keys(priceErrors).length,
      0,
    ) +
    Object.keys(errors.availability).length +
    (errors.extraStopCost ? 1 : 0)
  );
}

function normalisedMoneyInput(
  value: string,
  validate: (cents: number) => { ok: boolean },
): string | null {
  const parsed = parseRmInput(value);
  if (!parsed.ok || !validate(parsed.cents).ok) return null;
  return `${Math.floor(parsed.cents / 100)}.${String(parsed.cents % 100).padStart(2, "0")}`;
}

function FieldError({ id, message, visible }: FieldErrorProps) {
  if (!message || !visible) {
    return null;
  }

  return (
    <span className="field-error" id={id}>
      {message}
    </span>
  );
}

export function BasketWorkspace() {
  const initial = useMemo(getInitialWorkspace, []);
  const [draft, setDraft] = useState<BasketDraft>(initial.draft);
  const [hasCompared, setHasCompared] = useState(initial.hasCompared);
  const [restoreNotice, setRestoreNotice] = useState(initial.restoreNotice);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [comparisonAttempted, setComparisonAttempted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [focusInvalidRequest, setFocusInvalidRequest] = useState(0);
  const [touchedFields, setTouchedFields] = useState<Record<string, true>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const draftResult = useMemo(() => toBasketInput(draft), [draft]);
  const recommendation = useMemo(
    () =>
      hasCompared && draftResult.ok ? optimizeBasket(draftResult.input) : null,
    [draftResult, hasCompared],
  );
  const errors = draftResult.errors;
  const errorCount = countErrors(errors);

  useEffect(() => {
    setSaveFailed(!saveWorkspace(draft, hasCompared));
  }, [draft, hasCompared]);

  useEffect(() => {
    if (focusInvalidRequest === 0) return;

    const target = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], button[data-empty-action="true"]',
    );
    target?.focus();
  }, [focusInvalidRequest]);

  function isVisible(key: string): boolean {
    return comparisonAttempted || Boolean(touchedFields[key]);
  }

  function markTouched(key: string) {
    setTouchedFields((current) => ({ ...current, [key]: true }));
  }

  function addShop() {
    if (draft.shops.length >= 3) {
      return;
    }

    const id = createId("shop");

    setDraft((current) => ({
      ...current,
      shops: [...current.shops, { id, name: "" }],
      items: current.items.map((item) => ({
        ...item,
        priceInputsByStoreId: {
          ...item.priceInputsByStoreId,
          [id]: "",
        },
      })),
    }));
    setHasCompared(false);
    setComparisonAttempted(false);
  }

  function updateShopName(shopId: string, name: string) {
    setDraft((current) => ({
      ...current,
      shops: current.shops.map((shop) =>
        shop.id === shopId ? { ...shop, name } : shop,
      ),
    }));
  }

  function removeShop(shopId: string) {
    const hasEnteredPrices = draft.items.some(
      (item) => (item.priceInputsByStoreId[shopId] ?? "").trim() !== "",
    );

    if (
      hasEnteredPrices &&
      !window.confirm("Remove this shop and discard its entered prices?")
    ) {
      return;
    }

    setDraft((current) => ({
      ...current,
      shops: current.shops.filter((shop) => shop.id !== shopId),
      items: current.items.map((item) => {
        const nextPrices = { ...item.priceInputsByStoreId };
        delete nextPrices[shopId];
        return { ...item, priceInputsByStoreId: nextPrices };
      }),
    }));
  }

  function addItem() {
    if (draft.shops.length === 0 || draft.items.length >= 50) {
      return;
    }

    const id = createId("item");

    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id,
          name: "",
          quantityInput: "1",
          priceInputsByStoreId: Object.fromEntries(
            current.shops.map((shop) => [shop.id, ""]),
          ),
        },
      ],
    }));
    setHasCompared(false);
    setComparisonAttempted(false);
  }

  function updateItem(itemId: string, updates: Partial<EditableBasketItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    }));
  }

  function updatePrice(itemId: string, shopId: string, value: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              priceInputsByStoreId: {
                ...item.priceInputsByStoreId,
                [shopId]: value,
              },
            }
          : item,
      ),
    }));
  }

  function removeItem(itemId: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  function normalisePrice(itemId: string, shopId: string) {
    const item = draft.items.find((candidate) => candidate.id === itemId);
    const currentValue = item?.priceInputsByStoreId[shopId] ?? "";
    if (!currentValue.trim()) return;

    const normalised = normalisedMoneyInput(
      currentValue,
      validateItemPriceCents,
    );
    if (normalised !== null && normalised !== currentValue) {
      updatePrice(itemId, shopId, normalised);
    }
  }

  function normaliseExtraStopCost() {
    const normalised = normalisedMoneyInput(
      draft.extraStopCostInput,
      validateExtraStopCostCents,
    );
    if (normalised !== null && normalised !== draft.extraStopCostInput) {
      setDraft((current) => ({
        ...current,
        extraStopCostInput: normalised,
      }));
    }
  }

  function compareBasket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComparisonAttempted(true);

    if (!draftResult.ok) {
      setHasCompared(false);
      setFocusInvalidRequest((current) => current + 1);
      return;
    }

    setHasCompared(true);
  }

  function confirmReset() {
    const isEmpty = draft.shops.length === 0 && draft.items.length === 0;
    setDraft(isEmpty ? createSampleBasketDraft() : createEmptyBasketDraft());
    setHasCompared(isEmpty);
    setTouchedFields({});
    setComparisonAttempted(false);
    setShowResetConfirmation(false);
    setRestoreNotice(undefined);
  }

  function allItemPricesTouched(itemId: string): boolean {
    return (
      draft.shops.length > 0 &&
      draft.shops.every((shop) => touchedFields[priceKey(itemId, shop.id)])
    );
  }

  const readinessMessage =
    draft.shops.length === 0
      ? "Add your first shop to begin comparing prices."
      : draft.items.length === 0
        ? "Add at least one grocery item to build your comparison."
        : draftResult.ok && hasCompared
          ? "Your recommendation is current."
          : draftResult.ok
            ? "Your basket is ready to compare."
            : comparisonAttempted
              ? `Fix ${errorCount} ${errorCount === 1 ? "field" : "fields"} before comparing.`
              : "Keep completing the basket. Field guidance appears after you leave an input.";

  return (
    <Fragment>
      <form ref={formRef} onSubmit={compareBasket} noValidate>
      <section className="panel panel--workspace" aria-labelledby="basket-heading">
      <div className="section-heading section-heading--with-action">
        <div>
          <p className="step-label">Step 1</p>
          <h2 id="basket-heading">Build your basket</h2>
          <p>
            Add your groceries, quantities, and prices from up to three shops.
            Blank prices mean an item is unavailable there.
          </p>
        </div>
        <div className="workspace-tools">
          <span className={`saved-note ${saveFailed ? "saved-note--warning" : ""}`}>
            {saveFailed ? "Could not save on this device." : "Saved on this device."}
          </span>
          <button
            className="button button--text"
            type="button"
            onClick={() => setShowResetConfirmation(true)}
          >
            Reset basket
          </button>
        </div>
      </div>

      {restoreNotice && (
        <div className="storage-notice" role="status">
          <p>{restoreNotice}</p>
          <button type="button" className="button button--text" onClick={() => setRestoreNotice(undefined)}>
            Dismiss
          </button>
        </div>
      )}

      {showResetConfirmation && (
        <div className="reset-confirmation" role="alertdialog" aria-labelledby="reset-heading" aria-describedby="reset-description">
          <div>
            <h3 id="reset-heading">
              {draft.shops.length === 0 && draft.items.length === 0
                ? "Restore the sample basket?"
                : "Clear this basket?"}
            </h3>
            <p id="reset-description">
              {draft.shops.length === 0 && draft.items.length === 0
                ? "This loads the illustrative Malaysian basket and its comparison."
                : "This removes every shop, item, and entered price from this device."}
            </p>
          </div>
          <div className="reset-confirmation__actions">
            <button className="button button--secondary" type="button" onClick={() => setShowResetConfirmation(false)}>
              Cancel
            </button>
            <button className="button button--danger-solid" type="button" onClick={confirmReset}>
              {draft.shops.length === 0 && draft.items.length === 0
                ? "Restore sample"
                : "Clear basket"}
            </button>
          </div>
        </div>
      )}

      <fieldset className="editor-section shop-editor">
        <legend>Shops to compare</legend>
        <div className="editor-section__heading">
          <p>Use clear shop names so the price columns are easy to follow.</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={addShop}
            disabled={draft.shops.length >= 3}
          >
            Add shop
          </button>
        </div>

        {draft.shops.length === 0 ? (
          <div className="compact-empty-state">
            <p>No shops added yet.</p>
            <button className="button button--primary" type="button" onClick={addShop} data-empty-action="true">
              Add your first shop
            </button>
          </div>
        ) : (
          <div className="shop-list">
            {draft.shops.map((shop, index) => {
              const key = shopNameKey(shop.id);
              const errorId = `${shop.id}-name-error`;
              const error = errors.shopNames[shop.id];

              return (
                <div className="shop-card" key={shop.id}>
                  <label className="field-group" htmlFor={`${shop.id}-name`}>
                    <span className="field-label">Shop {index + 1} name</span>
                    <input
                      id={`${shop.id}-name`}
                      type="text"
                      value={shop.name}
                      placeholder="e.g. Lotus's"
                      autoComplete="off"
                      aria-invalid={Boolean(error && isVisible(key))}
                      aria-describedby={
                        error && isVisible(key) ? errorId : undefined
                      }
                      onChange={(event) =>
                        updateShopName(shop.id, event.target.value)
                      }
                      onBlur={() => markTouched(key)}
                    />
                    <FieldError
                      id={errorId}
                      message={error}
                      visible={isVisible(key)}
                    />
                  </label>
                  <button
                    className="button button--text button--danger"
                    type="button"
                    aria-label={`Remove ${shopDisplayName(shop, index)}`}
                    onClick={() => removeShop(shop.id)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {draft.shops.length >= 3 && (
          <p className="limit-note">Maximum of three shops reached.</p>
        )}
      </fieldset>

      <section className="editor-section" aria-labelledby="items-heading">
        <div className="editor-section__heading">
          <div>
            <h3 id="items-heading">Grocery items and prices</h3>
            <p>Enter each unit price in RM. Leave a price blank if unavailable.</p>
          </div>
          <button
            className="button button--secondary"
            type="button"
            onClick={addItem}
            disabled={draft.shops.length === 0 || draft.items.length >= 50}
          >
            Add item
          </button>
        </div>

        {draft.items.length === 0 ? (
          <div className="compact-empty-state compact-empty-state--items">
            <p>
              {draft.shops.length === 0
                ? "Add a shop before adding grocery items."
                : "Your basket has no items yet."}
            </p>
            <button
              className="button button--primary"
              type="button"
              onClick={addItem}
              disabled={draft.shops.length === 0}
              data-empty-action="true"
            >
              Add your first item
            </button>
          </div>
        ) : (
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <caption>Grocery item prices by shop</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Qty</th>
                  {draft.shops.map((shop, index) => (
                    <th scope="col" key={shop.id}>
                      {shopDisplayName(shop, index)}
                      <span className="column-unit">RM per unit</span>
                    </th>
                  ))}
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item, itemIndex) => {
                  const nameKey = itemNameKey(item.id);
                  const itemQuantityKey = quantityKey(item.id);
                  const nameErrorId = `${item.id}-name-error`;
                  const quantityErrorId = `${item.id}-quantity-error`;
                  const availabilityErrorId = `${item.id}-availability-error`;
                  const availabilityVisible =
                    comparisonAttempted || allItemPricesTouched(item.id);

                  return (
                    <tr className="item-row" key={item.id}>
                      <th scope="row" className="item-name-cell">
                        <label className="table-field" htmlFor={`${item.id}-name`}>
                          <span className="mobile-field-label">Item name</span>
                          <input
                            id={`${item.id}-name`}
                            type="text"
                            value={item.name}
                            placeholder="e.g. Rice"
                            autoComplete="off"
                            aria-label={`Item ${itemIndex + 1} name`}
                            aria-invalid={Boolean(
                              errors.itemNames[item.id] && isVisible(nameKey),
                            )}
                            aria-describedby={
                              errors.itemNames[item.id] && isVisible(nameKey)
                                ? nameErrorId
                                : undefined
                            }
                            onChange={(event) =>
                              updateItem(item.id, { name: event.target.value })
                            }
                            onBlur={() => markTouched(nameKey)}
                          />
                          <FieldError
                            id={nameErrorId}
                            message={errors.itemNames[item.id]}
                            visible={isVisible(nameKey)}
                          />
                        </label>
                        <FieldError
                          id={availabilityErrorId}
                          message={errors.availability[item.id]}
                          visible={availabilityVisible}
                        />
                      </th>
                      <td className="quantity-cell">
                        <label
                          className="table-field"
                          htmlFor={`${item.id}-quantity`}
                        >
                          <span className="mobile-field-label">Quantity</span>
                          <input
                            id={`${item.id}-quantity`}
                            className="quantity-input"
                            type="text"
                            inputMode="numeric"
                            value={item.quantityInput}
                            aria-label={`${itemDisplayName(item, itemIndex)} quantity`}
                            aria-invalid={Boolean(
                              errors.quantities[item.id] &&
                                isVisible(itemQuantityKey),
                            )}
                            aria-describedby={
                              errors.quantities[item.id] &&
                              isVisible(itemQuantityKey)
                                ? quantityErrorId
                                : undefined
                            }
                            onChange={(event) =>
                              updateItem(item.id, {
                                quantityInput: event.target.value,
                              })
                            }
                            onBlur={() => markTouched(itemQuantityKey)}
                          />
                          <FieldError
                            id={quantityErrorId}
                            message={errors.quantities[item.id]}
                            visible={isVisible(itemQuantityKey)}
                          />
                        </label>
                      </td>
                      {draft.shops.map((shop, shopIndex) => {
                        const key = priceKey(item.id, shop.id);
                        const errorId = `${item.id}-${shop.id}-price-error`;
                        const priceError = errors.prices[item.id]?.[shop.id];
                        const shopLabel = shopDisplayName(shop, shopIndex);
                        const itemLabel = itemDisplayName(item, itemIndex);

                        return (
                          <td className="price-cell" key={shop.id}>
                            <label className="table-field">
                              <span className="mobile-field-label">
                                {shopLabel} price (RM)
                              </span>
                              <span className="money-input">
                                <span aria-hidden="true">RM</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    item.priceInputsByStoreId[shop.id] ?? ""
                                  }
                                  placeholder="0.00"
                                  aria-label={`${itemLabel} price at ${shopLabel}`}
                                  aria-invalid={Boolean(
                                    (priceError && isVisible(key)) ||
                                      (errors.availability[item.id] &&
                                        availabilityVisible),
                                  )}
                                  aria-describedby={[
                                    priceError && isVisible(key)
                                      ? errorId
                                      : "",
                                    errors.availability[item.id] &&
                                    availabilityVisible
                                      ? availabilityErrorId
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ") || undefined}
                                  onChange={(event) =>
                                    updatePrice(
                                      item.id,
                                      shop.id,
                                      event.target.value,
                                    )
                                  }
                                  onBlur={() => {
                                    markTouched(key);
                                    normalisePrice(item.id, shop.id);
                                  }}
                                />
                              </span>
                              <FieldError
                                id={errorId}
                                message={priceError}
                                visible={isVisible(key)}
                              />
                            </label>
                          </td>
                        );
                      })}
                      <td className="item-action-cell">
                        <button
                          className="button button--text button--danger"
                          type="button"
                          aria-label={`Remove ${itemDisplayName(item, itemIndex)}`}
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="editor-section trip-cost" aria-labelledby="trip-cost-heading">
        <div>
          <h3 id="trip-cost-heading">Estimated extra-stop cost</h3>
          <p id="trip-cost-help">
            Estimate only the additional petrol, fare, parking, or inconvenience
            of visiting a second shop. Use RM0.00 if there is no extra cost.
          </p>
        </div>
        <label className="field-group trip-cost__field" htmlFor="extra-stop-cost">
          <span className="field-label">Additional cost (RM)</span>
          <span className="money-input money-input--large">
            <span aria-hidden="true">RM</span>
            <input
              id="extra-stop-cost"
              type="text"
              inputMode="decimal"
              value={draft.extraStopCostInput}
              aria-label="Additional cost (RM)"
              aria-describedby={`trip-cost-help${
                errors.extraStopCost && isVisible("extra-stop-cost")
                  ? " extra-stop-cost-error"
                  : ""
              }`}
              aria-invalid={Boolean(
                errors.extraStopCost && isVisible("extra-stop-cost"),
              )}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  extraStopCostInput: event.target.value,
                }))
              }
              onBlur={() => {
                markTouched("extra-stop-cost");
                normaliseExtraStopCost();
              }}
            />
          </span>
          <FieldError
            id="extra-stop-cost-error"
            message={errors.extraStopCost}
            visible={isVisible("extra-stop-cost")}
          />
        </label>
      </section>

      <div
        className={`readiness ${draftResult.ok ? "readiness--ready" : ""}`}
        role="status"
        aria-live="polite"
      >
        <span className="readiness__dot" aria-hidden="true" />
        <p>{readinessMessage}</p>
      </div>

      {comparisonAttempted && !draftResult.ok && (
        <div className="comparison-error-summary" role="alert">
          <strong>Fix {errorCount} {errorCount === 1 ? "field" : "fields"} before comparing.</strong>
          <p>Check the highlighted fields, then compare your basket again.</p>
        </div>
      )}

      <div className="compare-action">
        <div>
          <strong>Ready to check the real saving?</strong>
          <span>Blank price cells will be treated as unavailable.</span>
        </div>
        <button className="button button--primary button--compare" type="submit">
          Compare my basket
        </button>
      </div>
      </section>
      </form>
      <RecommendationView
        input={hasCompared && draftResult.ok ? draftResult.input : null}
        recommendation={recommendation}
      />
    </Fragment>
  );
}
