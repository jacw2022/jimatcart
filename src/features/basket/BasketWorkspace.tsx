import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, SetStateAction } from "react";
import { StatefulButton } from "../../components/ui/StatefulButton";
import {
  optimizeBasket,
  parseRmInput,
  validateTripCostCents,
  validateItemPriceCents,
} from "../../domain";
import { loadWorkspace, saveWorkspace } from "../../storage/basketStorage";
import { RecommendationView } from "../recommendation/RecommendationView";
import { ItemOfferEditor } from "./ItemOfferEditor";
import { ShopEditor } from "./ShopEditor";
import { TripCostEditor } from "./TripCostEditor";
import {
  EMPTY_BASKET_DRAFT,
  reconcileTripCosts,
  toBasketInput,
} from "./basketDraft";
import type {
  BasketDraft,
  BasketDraftResult,
  EditableBasketItem,
} from "./basketDraft";
import { createSampleBasketDraft } from "./sampleBasket";

interface InitialWorkspace {
  draft: BasketDraft;
  notice?: string;
}

let fallbackId = 0;

function createId(prefix: "shop" | "item"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  fallbackId += 1;
  return `${prefix}-local-${fallbackId}`;
}

function getInitialWorkspace(): InitialWorkspace {
  const saved = loadWorkspace();
  if (saved.status === "restored") return { draft: saved.draft };
  return {
    draft: createSampleBasketDraft(),
    notice:
      saved.status === "invalid"
        ? "Saved basket data was incompatible, so a fresh example basket was loaded."
        : "Example basket loaded. Edit it or start with an empty basket.",
  };
}

function countErrors(errors: BasketDraftResult["errors"]): number {
  const priceErrorCount = Object.values(errors.prices).reduce(
    (total, byShop) => total + Object.keys(byShop).length,
    0,
  );
  return (
    errors.general.length +
    Object.keys(errors.shopNames).length +
    Object.keys(errors.itemNames).length +
    Object.keys(errors.quantities).length +
    Object.keys(errors.availability).length +
    Object.keys(errors.tripCosts).length +
    priceErrorCount
  );
}

function normalizedMoney(
  value: string,
  validate: (cents: number) => { ok: boolean },
): string | null {
  const parsed = parseRmInput(value);
  if (!parsed.ok || !validate(parsed.cents).ok) return null;
  return `${Math.floor(parsed.cents / 100)}.${String(parsed.cents % 100).padStart(2, "0")}`;
}

export function BasketWorkspace() {
  const initial = useMemo(getInitialWorkspace, []);
  const [draft, setDraft] = useState(initial.draft);
  const [notice, setNotice] = useState(initial.notice);
  const [hasCompared, setHasCompared] = useState(false);
  const [comparisonAttempted, setComparisonAttempted] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [revealRequest, setRevealRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const draftResult = useMemo(() => toBasketInput(draft), [draft]);
  const recommendation = useMemo(
    () =>
      hasCompared && draftResult.ok ? optimizeBasket(draftResult.input) : null,
    [draftResult, hasCompared],
  );
  const errorCount = countErrors(draftResult.errors);

  function updateDraft(update: SetStateAction<BasketDraft>) {
    setHasCompared(false);
    setDraft(update);
  }

  useEffect(() => {
    setSaveFailed(!saveWorkspace(draft, hasCompared));
  }, [draft, hasCompared]);

  function addShop() {
    if (draft.shops.length >= 3) return;
    const id = createId("shop");
    updateDraft((current) => {
      const shops = [...current.shops, { id, name: "" }];
      return {
        ...current,
        shops,
        items: current.items.map((item) => ({
          ...item,
          priceInputsByStoreId: {
            ...item.priceInputsByStoreId,
            [id]: "",
          },
        })),
        tripCosts: reconcileTripCosts(shops, current.tripCosts),
      };
    });
    setComparisonAttempted(false);
  }

  function removeShop(shopId: string) {
    const hasOfferData = draft.items.some((item) => {
      return Boolean(item.priceInputsByStoreId[shopId]?.trim());
    });
    if (
      hasOfferData &&
      !window.confirm("Remove this shop and discard its entered prices?")
    ) {
      return;
    }
    updateDraft((current) => {
      const shops = current.shops.filter(({ id }) => id !== shopId);
      return {
        ...current,
        shops,
        items: current.items.map((item) => {
          const priceInputsByStoreId = { ...item.priceInputsByStoreId };
          delete priceInputsByStoreId[shopId];
          return { ...item, priceInputsByStoreId };
        }),
        tripCosts: reconcileTripCosts(shops, current.tripCosts),
      };
    });
  }

  function updateShopName(shopId: string, name: string) {
    updateDraft((current) => ({
      ...current,
      shops: current.shops.map((shop) =>
        shop.id === shopId ? { ...shop, name } : shop,
      ),
    }));
  }

  function addItem() {
    if (draft.shops.length === 0 || draft.items.length >= 50) return;
    const id = createId("item");
    updateDraft((current) => ({
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
    setComparisonAttempted(false);
  }

  function updateItem(
    itemId: string,
    updates: Partial<EditableBasketItem>,
  ) {
    updateDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    }));
  }

  function updatePrice(
    itemId: string,
    shopId: string,
    value: string,
  ) {
    updateDraft((current) => ({
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

  function normalizePrice(itemId: string, shopId: string) {
    const value =
      draft.items.find(({ id }) => id === itemId)?.priceInputsByStoreId[shopId] ?? "";
    if (!value.trim()) return;
    const normalized = normalizedMoney(value, validateItemPriceCents);
    if (normalized !== null && normalized !== value) {
      updatePrice(itemId, shopId, normalized);
    }
  }

  function updateTripCost(index: number, value: string) {
    updateDraft((current) => ({
      ...current,
      tripCosts: current.tripCosts.map((trip, tripIndex) =>
        tripIndex === index ? { ...trip, costInput: value } : trip,
      ),
    }));
  }

  function normalizeTripCost(index: number) {
    const value = draft.tripCosts[index]?.costInput ?? "";
    const normalized = normalizedMoney(value, validateTripCostCents);
    if (normalized !== null && normalized !== value) {
      updateTripCost(index, normalized);
    }
  }

  function compareBasket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComparisonAttempted(true);
    if (!draftResult.ok) {
      setHasCompared(false);
      queueMicrotask(() => {
        formRef.current
          ?.querySelector<HTMLElement>(
            '[aria-invalid="true"], button[data-empty-action="true"]',
          )
          ?.focus();
      });
      return;
    }
    setHasCompared(true);
    setRevealRequest((current) => current + 1);
  }

  function confirmReset() {
    const empty = draft.shops.length === 0 && draft.items.length === 0;
    updateDraft(empty ? createSampleBasketDraft() : structuredClone(EMPTY_BASKET_DRAFT));
    setComparisonAttempted(false);
    setShowResetConfirmation(false);
    setNotice(empty ? "Example basket loaded." : undefined);
  }

  const readinessMessage =
    draft.shops.length === 0
      ? "Add your first shop to begin."
      : draft.items.length === 0
        ? "Add at least one grocery item."
        : draftResult.ok
          ? "Your basket is ready to compare."
          : comparisonAttempted
            ? `Fix ${errorCount} ${errorCount === 1 ? "field" : "fields"} before comparing.`
            : "Complete the quantities, prices and trip estimates.";

  return (
    <Fragment>
      <form ref={formRef} onSubmit={compareBasket} noValidate>
        <section className="panel panel--workspace" aria-labelledby="basket-heading">
          <div className="section-heading section-heading--with-action">
            <div>
              <p className="step-label">Step 1</p>
              <h2 id="basket-heading">Build your basket</h2>
              <p>
                Add each quantity and unit price, then include the full travel
                cost for each possible shopping plan.
              </p>
            </div>
            <div className="workspace-tools">
              {saveFailed && (
                <span className="saved-note saved-note--warning">
                  Could not save on this device.
                </span>
              )}
              <button
                className="button button--reset"
                type="button"
                onClick={() => setShowResetConfirmation(true)}
              >
                Reset basket
              </button>
            </div>
          </div>

          {notice && (
            <div className="storage-notice" role="status">
              <p>{notice}</p>
              <div>
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => {
                    updateDraft(structuredClone(EMPTY_BASKET_DRAFT));
                    setNotice(undefined);
                  }}
                >
                  Start empty
                </button>
                <button
                  type="button"
                  className="button button--text"
                  onClick={() => setNotice(undefined)}
                >
                  Keep example
                </button>
              </div>
            </div>
          )}

          {showResetConfirmation && (
            <div
              className="reset-confirmation"
              role="alertdialog"
              aria-labelledby="reset-heading"
              aria-describedby="reset-description"
            >
              <div>
                <h3 id="reset-heading">
                  {draft.shops.length === 0 && draft.items.length === 0
                    ? "Restore the example basket?"
                    : "Clear this basket?"}
                </h3>
                <p id="reset-description">
                  {draft.shops.length === 0 && draft.items.length === 0
                    ? "This loads the demonstration shops, prices and trip costs."
                    : "This removes all current shops, groceries, prices and trip estimates."}
                </p>
              </div>
              <div className="reset-confirmation__actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => setShowResetConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  className="button button--danger"
                  type="button"
                  onClick={confirmReset}
                >
                  {draft.shops.length === 0 && draft.items.length === 0
                    ? "Load example"
                    : "Clear basket"}
                </button>
              </div>
            </div>
          )}

          {comparisonAttempted && draftResult.errors.general.length > 0 && (
            <div className="comparison-error-summary" role="alert">
              <strong>Complete the basket before comparing.</strong>
              {draftResult.errors.general.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <ShopEditor
            shops={draft.shops}
            errors={draftResult.errors.shopNames}
            showErrors={comparisonAttempted}
            onAdd={addShop}
            onNameChange={updateShopName}
            onRemove={removeShop}
          />
          <ItemOfferEditor
            items={draft.items}
            shops={draft.shops}
            errors={draftResult.errors}
            showErrors={comparisonAttempted}
            onAdd={addItem}
            onRemove={(itemId) =>
              updateDraft((current) => ({
                ...current,
                items: current.items.filter(({ id }) => id !== itemId),
              }))
            }
            onItemChange={updateItem}
            onPriceChange={updatePrice}
            onPriceBlur={normalizePrice}
          />
          <TripCostEditor
            shops={draft.shops}
            tripCosts={draft.tripCosts}
            errors={draftResult.errors.tripCosts}
            showErrors={comparisonAttempted}
            onChange={updateTripCost}
            onBlur={normalizeTripCost}
          />

          <div className="readiness" aria-live="polite">
            <span className="readiness__dot" aria-hidden="true" />
            <p>{readinessMessage}</p>
          </div>
          <div className="compare-action">
            <div>
              <strong>Ready to check the real saving?</strong>
              <span>Totals include item quantities, unit prices and travel.</span>
            </div>
            <StatefulButton
              className="button--primary button--compare"
              resetSignal={draft}
              type="submit"
            >
              Compare my basket
            </StatefulButton>
          </div>
        </section>
      </form>
      <RecommendationView
        input={hasCompared && draftResult.ok ? draftResult.input : null}
        recommendation={recommendation}
        revealRequest={revealRequest}
      />
    </Fragment>
  );
}
