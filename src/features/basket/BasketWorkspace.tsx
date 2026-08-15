import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, SetStateAction } from "react";
import { motion } from "motion/react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
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
import { WelcomeStep } from "./WelcomeStep";
import { WizardNav } from "./WizardNav";
import { WizardProgress } from "./WizardProgress";
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
import {
  canAdvanceFromItems,
  canAdvanceFromShops,
  canAdvanceFromTrips,
  formatItemsStatusHint,
  formatTripsStatusHint,
  type WizardStepIndex,
} from "./wizardSteps";

interface InitialWorkspace {
  draft: BasketDraft;
  notice?: string;
  hasCompared: boolean;
  step: WizardStepIndex;
}

interface FieldErrorLink {
  fieldId: string;
  message: string;
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
  if (saved.status === "restored") {
    const draftResult = toBasketInput(saved.draft);
    const landOnResults = saved.hasCompared && draftResult.ok;
    return {
      draft: saved.draft,
      hasCompared: landOnResults,
      step: landOnResults ? 4 : 0,
    };
  }
  return {
    draft: createSampleBasketDraft(),
    hasCompared: false,
    step: 0,
    notice:
      saved.status === "invalid"
        ? "Saved basket data was incompatible, so a fresh example basket was loaded."
        : "Example basket loaded. Edit it or start with an empty basket.",
  };
}

function shopFieldErrors(
  draft: BasketDraft,
  errors: BasketDraftResult["errors"],
): FieldErrorLink[] {
  return draft.shops.flatMap((shop, index) => {
    const message = errors.shopNames[shop.id];
    if (!message) return [];
    const label = shop.name.trim() || `Shop ${index + 1}`;
    return [{ fieldId: `${shop.id}-name`, message: `${label}: ${message}` }];
  });
}

function itemFieldErrors(
  draft: BasketDraft,
  errors: BasketDraftResult["errors"],
): FieldErrorLink[] {
  const links: FieldErrorLink[] = [];
  draft.items.forEach((item, index) => {
    const itemName = item.name.trim() || `Item ${index + 1}`;
    const nameError = errors.itemNames[item.id];
    if (nameError) {
      links.push({
        fieldId: `${item.id}-name`,
        message: `${itemName}: ${nameError}`,
      });
    }
    const quantityError = errors.quantities[item.id];
    if (quantityError) {
      links.push({
        fieldId: `${item.id}-qty`,
        message: `${itemName} quantity: ${quantityError}`,
      });
    }
    const availabilityError = errors.availability[item.id];
    if (availabilityError) {
      links.push({
        fieldId: `${item.id}-name`,
        message: `${itemName}: ${availabilityError}`,
      });
    }
    draft.shops.forEach((shop) => {
      const priceError = errors.prices[item.id]?.[shop.id];
      if (!priceError) return;
      const shopName = shop.name.trim() || "Unnamed shop";
      links.push({
        fieldId: `${item.id}-price-${shop.id}`,
        message: `${itemName} at ${shopName}: ${priceError}`,
      });
    });
  });
  return links;
}

function tripFieldErrors(
  draft: BasketDraft,
  errors: BasketDraftResult["errors"],
): FieldErrorLink[] {
  return draft.tripCosts.flatMap((trip, index) => {
    const message = errors.tripCosts[index];
    if (!message) return [];
    const route = trip.storeIds
      .map((id) => {
        const shop = draft.shops.find((candidate) => candidate.id === id);
        return shop?.name.trim() || "Unnamed shop";
      })
      .join(" + ");
    return [{ fieldId: `trip-cost-${index}`, message: `${route}: ${message}` }];
  });
}

function StepErrorSummary({ errors }: { errors: FieldErrorLink[] }) {
  if (errors.length === 0) return null;
  const countLabel =
    errors.length === 1
      ? "1 field needs attention"
      : `${errors.length} fields need attention`;
  return (
    <div className="comparison-error-summary" role="alert">
      <strong>{countLabel}</strong>
      <ul>
        {errors.map((error) => (
          <li key={`${error.fieldId}:${error.message}`}>
            <a href={`#${error.fieldId}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
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

const stepEase = [0.22, 1, 0.36, 1] as const;

export function BasketWorkspace() {
  const initial = useMemo(getInitialWorkspace, []);
  const [draft, setDraft] = useState(initial.draft);
  const [notice, setNotice] = useState(initial.notice);
  const [hasCompared, setHasCompared] = useState(initial.hasCompared);
  const [comparisonAttempted, setComparisonAttempted] = useState(false);
  const [stepAttempted, setStepAttempted] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [pendingShopRemoval, setPendingShopRemoval] = useState<{
    shopId: string;
    shopName: string;
    lostPrices: number;
    lostTrips: number;
  } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [revealRequest, setRevealRequest] = useState(0);
  const [touchedFields, setTouchedFields] = useState(() => new Set<string>());
  const [step, setStep] = useState<WizardStepIndex>(initial.step);
  const [stepDirection, setStepDirection] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftResult = useMemo(() => toBasketInput(draft), [draft]);
  const recommendation = useMemo(
    () =>
      hasCompared && draftResult.ok ? optimizeBasket(draftResult.input) : null,
    [draftResult, hasCompared],
  );
  const maxReachable: WizardStepIndex =
    hasCompared && draftResult.ok ? 4 : (Math.min(step, 3) as WizardStepIndex);

  function goToStep(next: WizardStepIndex) {
    setStepDirection(next > step ? 1 : -1);
    setStep(next);
    setStepAttempted(false);
    setTouchedFields(new Set());
  }

  function markFieldTouched(fieldId: string) {
    setTouchedFields((current) => {
      if (current.has(fieldId)) return current;
      const next = new Set(current);
      next.add(fieldId);
      return next;
    });
  }

  function shouldShowFieldError(fieldId: string): boolean {
    return stepAttempted || comparisonAttempted || touchedFields.has(fieldId);
  }

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    } catch {
      // jsdom does not implement scrollTo
    }
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

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
          unavailableByStoreId: {
            ...item.unavailableByStoreId,
          },
        })),
        tripCosts: reconcileTripCosts(shops, current.tripCosts),
      };
    });
    setComparisonAttempted(false);
  }

  function commitRemoveShop(shopId: string) {
    updateDraft((current) => {
      const shops = current.shops.filter(({ id }) => id !== shopId);
      return {
        ...current,
        shops,
        items: current.items.map((item) => {
          const priceInputsByStoreId = { ...item.priceInputsByStoreId };
          const unavailableByStoreId = { ...item.unavailableByStoreId };
          delete priceInputsByStoreId[shopId];
          delete unavailableByStoreId[shopId];
          return { ...item, priceInputsByStoreId, unavailableByStoreId };
        }),
        tripCosts: reconcileTripCosts(shops, current.tripCosts),
      };
    });
  }

  function removeShop(shopId: string) {
    const shop = draft.shops.find(({ id }) => id === shopId);
    const shopIndex = draft.shops.findIndex(({ id }) => id === shopId);
    const shopName = shop?.name.trim() || `shop ${shopIndex + 1}`;
    const lostPrices = draft.items.filter((item) =>
      Boolean(item.priceInputsByStoreId[shopId]?.trim()),
    ).length;
    const lostTrips = draft.tripCosts.filter(
      (trip) =>
        trip.storeIds.includes(shopId) && Boolean(trip.costInput.trim()),
    ).length;

    if (lostPrices === 0 && lostTrips === 0) {
      commitRemoveShop(shopId);
      return;
    }

    setPendingShopRemoval({
      shopId,
      shopName,
      lostPrices,
      lostTrips,
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
          unavailableByStoreId: {},
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
      items: current.items.map((item) => {
        if (item.id !== itemId) return item;
        const unavailableByStoreId = { ...item.unavailableByStoreId };
        if (value.trim()) delete unavailableByStoreId[shopId];
        return {
          ...item,
          priceInputsByStoreId: {
            ...item.priceInputsByStoreId,
            [shopId]: value,
          },
          unavailableByStoreId,
        };
      }),
    }));
  }

  function updateUnavailable(
    itemId: string,
    shopId: string,
    unavailable: boolean,
  ) {
    updateDraft((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) return item;
        const unavailableByStoreId = { ...item.unavailableByStoreId };
        const priceInputsByStoreId = { ...item.priceInputsByStoreId };
        if (unavailable) {
          unavailableByStoreId[shopId] = true;
          priceInputsByStoreId[shopId] = "";
        } else {
          delete unavailableByStoreId[shopId];
        }
        return { ...item, unavailableByStoreId, priceInputsByStoreId };
      }),
    }));
  }

  function normalizePrice(itemId: string, shopId: string) {
    const value =
      draft.items.find(({ id }) => id === itemId)?.priceInputsByStoreId[shopId] ??
      "";
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

  function focusFirstInvalid() {
    window.setTimeout(() => {
      formRef.current
        ?.querySelector<HTMLElement>(
          '[aria-invalid="true"], button[data-empty-action="true"]',
        )
        ?.focus();
    }, 0);
  }

  function advanceFromShops() {
    setStepAttempted(true);
    if (!canAdvanceFromShops(draft, draftResult.errors)) {
      focusFirstInvalid();
      return;
    }
    goToStep(2);
  }

  function advanceFromItems() {
    setStepAttempted(true);
    if (!canAdvanceFromItems(draft, draftResult.errors)) {
      focusFirstInvalid();
      return;
    }
    goToStep(3);
  }

  function compareBasket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComparisonAttempted(true);
    setStepAttempted(true);
    if (!canAdvanceFromTrips(draftResult.ok) || !draftResult.ok) {
      setHasCompared(false);
      focusFirstInvalid();
      return;
    }
    setHasCompared(true);
    setRevealRequest((current) => current + 1);
    goToStep(4);
  }

  function confirmReset() {
    const empty = draft.shops.length === 0 && draft.items.length === 0;
    updateDraft(
      empty ? createSampleBasketDraft() : structuredClone(EMPTY_BASKET_DRAFT),
    );
    setComparisonAttempted(false);
    setTouchedFields(new Set());
    setShowResetConfirmation(false);
    setNotice(empty ? "Example basket loaded." : undefined);
    goToStep(1);
  }

  const showStepErrors = stepAttempted || comparisonAttempted;
  const shopsErrors = shopFieldErrors(draft, draftResult.errors);
  const itemsErrors = itemFieldErrors(draft, draftResult.errors);
  const tripsErrors = [
    ...tripFieldErrors(draft, draftResult.errors),
    ...draftResult.errors.general.map((message) => ({
      fieldId: "trips-heading",
      message,
    })),
  ];

  const shopsHint =
    draft.shops.length === 0
      ? "Add your first shop to continue."
      : !canAdvanceFromShops(draft, draftResult.errors)
        ? stepAttempted
          ? "Fix shop names before continuing."
          : "Name each shop to continue."
        : "Looking good — next, add groceries.";

  const itemsHint = formatItemsStatusHint(
    draft,
    draftResult.errors,
    stepAttempted,
  );

  const tripsHint = formatTripsStatusHint(
    draft,
    draftResult.errors,
    draftResult.ok,
    stepAttempted || comparisonAttempted,
  );

  const chromeTools = step > 0 && step < 4 && (
    <div className="workspace-tools">
      {saveFailed && (
        <span className="saved-note saved-note--warning">
          Could not save on this device.
        </span>
      )}
      <button
        className="button button--reset button--reset-quiet"
        type="button"
        onClick={() => setShowResetConfirmation(true)}
      >
        Reset basket
      </button>
    </div>
  );

  const sharedNotices = (
    <Fragment>
      {notice && step > 0 && step < 4 && (
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
    </Fragment>
  );

  const restoringExample =
    draft.shops.length === 0 && draft.items.length === 0;

  function shopRemovalDescription(
    shopName: string,
    lostPrices: number,
    lostTrips: number,
  ): string {
    const parts: string[] = [];
    if (lostPrices > 0) {
      parts.push(
        `${lostPrices} price${lostPrices === 1 ? "" : "s"}`,
      );
    }
    if (lostTrips > 0) {
      parts.push(
        `${lostTrips} trip cost${lostTrips === 1 ? "" : "s"}`,
      );
    }
    return `Removing ${shopName} discards ${parts.join(" and ")}.`;
  }

  const confirmDialogs = (
    <>
      <ConfirmDialog
        open={showResetConfirmation}
        title={
          restoringExample ? "Restore the example basket?" : "Clear this basket?"
        }
        description={
          restoringExample
            ? "This loads the demonstration shops, prices and trip costs."
            : "This removes all current shops, groceries, prices and trip estimates."
        }
        confirmLabel={restoringExample ? "Load example" : "Clear basket"}
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirmation(false)}
      />
      <ConfirmDialog
        open={pendingShopRemoval !== null}
        title="Remove this shop?"
        description={
          pendingShopRemoval
            ? shopRemovalDescription(
                pendingShopRemoval.shopName,
                pendingShopRemoval.lostPrices,
                pendingShopRemoval.lostTrips,
              )
            : ""
        }
        confirmLabel="Remove shop"
        onConfirm={() => {
          if (!pendingShopRemoval) return;
          commitRemoveShop(pendingShopRemoval.shopId);
          setPendingShopRemoval(null);
        }}
        onCancel={() => setPendingShopRemoval(null)}
      />
    </>
  );

  return (
    <div className="wizard">
      {step > 0 && (
        <WizardProgress
          current={step}
          maxReachable={maxReachable}
          onJump={(next) => {
            if (next <= maxReachable) goToStep(next);
          }}
        />
      )}

      <motion.div
        key={step}
        className="wizard__stage"
        initial={{ opacity: 0, x: stepDirection * 36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: stepEase }}
      >
        {step === 0 && (
          <WelcomeStep headingRef={headingRef} onStart={() => goToStep(1)} />
        )}

        {step === 1 && (
          <form
            ref={formRef}
            className="wizard-panel"
            onSubmit={(event) => {
              event.preventDefault();
              advanceFromShops();
            }}
            noValidate
          >
            <section
              className="panel panel--workspace"
              aria-labelledby="shops-heading"
            >
              <div className="section-heading section-heading--with-action">
                <div>
                  <h1
                    ref={headingRef}
                    id="shops-heading"
                    className="step-heading"
                    tabIndex={-1}
                  >
                    Where do you shop?
                  </h1>
                  <p>Add up to three nearby shops you might visit.</p>
                </div>
                {chromeTools}
              </div>
              {sharedNotices}
              {showStepErrors && <StepErrorSummary errors={shopsErrors} />}
              <ShopEditor
                shops={draft.shops}
                errors={draftResult.errors.shopNames}
                shouldShowFieldError={shouldShowFieldError}
                onFieldTouched={markFieldTouched}
                onAdd={addShop}
                onNameChange={updateShopName}
                onRemove={removeShop}
              />
              <WizardNav
                showBack
                onBack={() => goToStep(0)}
                primaryLabel="Next: Items"
                primaryType="submit"
                hint={shopsHint}
              />
            </section>
          </form>
        )}

        {step === 2 && (
          <form
            ref={formRef}
            className="wizard-panel"
            onSubmit={(event) => {
              event.preventDefault();
              advanceFromItems();
            }}
            noValidate
          >
            <section
              className="panel panel--workspace"
              aria-labelledby="items-heading"
            >
              <div className="section-heading section-heading--with-action">
                <div>
                  <h1
                    ref={headingRef}
                    id="items-heading"
                    className="step-heading"
                    tabIndex={-1}
                  >
                    What&apos;s in the basket?
                  </h1>
                  <p>
                    Add each grocery with quantity and the unit price at every
                    shop.
                  </p>
                </div>
                {chromeTools}
              </div>
              {sharedNotices}
              {showStepErrors && <StepErrorSummary errors={itemsErrors} />}
              <ItemOfferEditor
                items={draft.items}
                shops={draft.shops}
                errors={draftResult.errors}
                showAllErrors={showStepErrors}
                shouldShowFieldError={shouldShowFieldError}
                onFieldTouched={markFieldTouched}
                onAdd={addItem}
                onRemove={(itemId) =>
                  updateDraft((current) => ({
                    ...current,
                    items: current.items.filter(({ id }) => id !== itemId),
                  }))
                }
                onItemChange={updateItem}
                onPriceChange={updatePrice}
                onUnavailableChange={updateUnavailable}
                onPriceBlur={normalizePrice}
              />
              <WizardNav
                showBack
                onBack={() => goToStep(1)}
                primaryLabel="Next: Trip costs"
                primaryType="submit"
                hint={itemsHint}
              />
            </section>
          </form>
        )}

        {step === 3 && (
          <form
            ref={formRef}
            className="wizard-panel"
            onSubmit={compareBasket}
            noValidate
          >
            <section
              className="panel panel--workspace"
              aria-labelledby="trips-heading"
            >
              <div className="section-heading section-heading--with-action">
                <div>
                  <h1
                    ref={headingRef}
                    id="trips-heading"
                    className="step-heading"
                    tabIndex={-1}
                  >
                    How much to get there?
                  </h1>
                  <p>Add travel estimates for each shopping plan.</p>
                </div>
                {chromeTools}
              </div>
              {sharedNotices}
              {showStepErrors && <StepErrorSummary errors={tripsErrors} />}
              <TripCostEditor
                shops={draft.shops}
                tripCosts={draft.tripCosts}
                errors={draftResult.errors.tripCosts}
                shouldShowFieldError={shouldShowFieldError}
                onFieldTouched={markFieldTouched}
                onChange={updateTripCost}
                onBlur={normalizeTripCost}
              />
              <WizardNav
                showBack
                onBack={() => goToStep(2)}
                primaryLabel="Compare total costs"
                useCompareButton
                compareResetSignal={draft}
                hint={tripsHint}
              />
            </section>
          </form>
        )}

        {step === 4 && (
          <div className="wizard-panel wizard-panel--results">
            <RecommendationView
              input={hasCompared && draftResult.ok ? draftResult.input : null}
              recommendation={recommendation}
              revealRequest={revealRequest}
              headingRef={headingRef}
              onEditBasket={() => goToStep(1)}
              onStartOver={() => {
                setShowResetConfirmation(true);
              }}
            />
          </div>
        )}
      </motion.div>
      {confirmDialogs}
    </div>
  );
}
