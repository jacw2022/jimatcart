import { useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { formatRm } from "../../domain";
import type {
  BasketInput,
  PurchaseAssignment,
  Recommendation,
} from "../../domain";
import { buildShoppingPlanText } from "./shoppingPlan";

interface RecommendationViewProps {
  input: BasketInput | null;
  recommendation: Recommendation | null;
  revealRequest?: number;
  headingRef?: Ref<HTMLHeadingElement>;
  onEditBasket?: () => void;
  onStartOver?: () => void;
}

interface AssignmentGroup {
  storeId: string;
  storeName: string;
  assignments: PurchaseAssignment[];
}

interface ResultHeadline {
  title: string;
  support: string;
  tone: "success" | "practical" | "error";
}

type ExportStatus = { tone: "success" | "error"; message: string } | null;

function groupAssignments(
  input: BasketInput,
  recommendation: Recommendation,
): AssignmentGroup[] {
  return recommendation.storesUsed.map((storeId) => ({
    storeId,
    storeName:
      input.stores.find(({ id }) => id === storeId)?.name ?? "Unknown shop",
    assignments: recommendation.assignments.filter(
      (assignment) => assignment.storeId === storeId,
    ),
  }));
}

function optionLabel(names: string[]): string {
  return names.join(" + ");
}

function headline(input: BasketInput, recommendation: Recommendation): ResultHeadline {
  if (recommendation.status === "no-valid-plan") {
    return {
      title: "No complete plan yet",
      support: recommendation.explanation[0] ?? "Add missing prices to continue.",
      tone: "error",
    };
  }

  const names = recommendation.storesUsed.map(
    (id) => input.stores.find((store) => store.id === id)?.name ?? "Unknown shop",
  );
  const label = optionLabel(names);

  if (recommendation.storesUsed.length === 2) {
    if (recommendation.bestSingleStoreTotalCents === null) {
      return {
        title: `Lowest-cost option: ${label}`,
        support: "No single shop has a price for every item.",
        tone: "practical",
      };
    }
    const saving = recommendation.netSavingCents ?? 0;
    if (saving > 0 && saving < 100) {
      return {
        title: `Lowest-cost option: ${label}`,
        support: `Only ${formatRm(saving)} cheaper than one shop after travel — a second stop may not be worth it.`,
        tone: "practical",
      };
    }
    return {
      title: `Lowest-cost option: ${label}`,
      support:
        saving > 0
          ? `Save ${formatRm(saving)} versus the best single-shop plan`
          : "Matches the best single-shop total after travel.",
      tone: "success",
    };
  }

  const compared = recommendation.twoStoreComparison;
  if (
    compared &&
    recommendation.breakEvenTripCostCents !== null &&
    compared.travelCostCents === recommendation.breakEvenTripCostCents
  ) {
    return {
      title: `Lowest-cost option: ${label}`,
      support: "Totals tie with a split plan, so one shop is preferred.",
      tone: "practical",
    };
  }
  if (
    compared &&
    recommendation.bestSingleStoreTotalCents !== null &&
    compared.finalTotalCents > recommendation.bestSingleStoreTotalCents
  ) {
    return {
      title: `Lowest-cost option: ${label}`,
      support: `Splitting would cost ${formatRm(
        compared.finalTotalCents - recommendation.bestSingleStoreTotalCents,
      )} more after travel.`,
      tone: "practical",
    };
  }
  return {
    title: `Lowest-cost option: ${label}`,
    support: "Lowest complete grocery and travel total.",
    tone: "success",
  };
}

/** Drops lines already covered by the hero or cost summary. */
function uniqueReasons(explanation: string[]): string[] {
  return explanation.filter((line) => {
    if (/^Buy everything at /.test(line)) return false;
    if (/^Split the basket between /.test(line)) return false;
    if (/^Groceries cost /.test(line)) return false;
    if (/^This plan saves /.test(line)) return false;
    if (/break-even/i.test(line)) return false;
    if (/cheaper only while its combined trip/.test(line)) return false;
    return true;
  });
}

function ShoppingPlanExport({ planText }: { planText: string }) {
  const [status, setStatus] = useState<ExportStatus>(null);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 1400);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copyPlan() {
    setStatus(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Unavailable");
      await navigator.clipboard.writeText(planText);
      setStatus({ tone: "success", message: "Saved to clipboard." });
    } catch {
      setStatus({
        tone: "error",
        message: "Could not copy the plan. Check clipboard permission and try again.",
      });
    }
  }

  function downloadPlan() {
    setStatus(null);
    try {
      const blob = new Blob([planText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "jimatcart-shopping-plan.txt";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus({ tone: "success", message: "Shopping plan downloaded." });
    } catch {
      setStatus({ tone: "error", message: "Could not download the plan. Please try again." });
    }
  }

  return (
    <div className="shopping-plan-export shopping-plan-export--quiet">
      <p className="shopping-plan-export__label">Take this plan with you</p>
      <div className="shopping-plan-export__actions">
        <button className="button button--primary" type="button" onClick={copyPlan}>
          Copy plan
        </button>
        <button className="button button--download" type="button" onClick={downloadPlan}>
          Download plan
        </button>
      </div>
      {status && (
        <p
          className={`shopping-plan-export__status shopping-plan-export__status--${status.tone}`}
          role={status.tone === "error" ? "alert" : "status"}
          aria-live={status.tone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {status.message}
        </p>
      )}
    </div>
  );
}

function Assumptions() {
  return (
    <details className="result-assumptions">
      <summary id="assumptions-heading">Assumptions &amp; limitations</summary>
      <ul>
        <li>Each item&apos;s full quantity is bought from one shop.</li>
        <li>Unit prices and total trip costs are manually entered.</li>
        <li>Brand, quality, stock, promotions and travel time are excluded.</li>
        <li>Shop order is not a route recommendation.</li>
      </ul>
    </details>
  );
}

export function RecommendationView({
  input,
  recommendation,
  revealRequest = 0,
  headingRef,
  onEditBasket,
  onStartOver,
}: RecommendationViewProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previousReveal = useRef(revealRequest);
  const resultHeadline = useMemo(
    () => (input && recommendation ? headline(input, recommendation) : null),
    [input, recommendation],
  );
  const groups = useMemo(
    () =>
      input && recommendation?.status === "success"
        ? groupAssignments(input, recommendation)
        : [],
    [input, recommendation],
  );
  const planText = useMemo(
    () =>
      input && recommendation
        ? buildShoppingPlanText(input, recommendation)
        : null,
    [input, recommendation],
  );
  const reasons = useMemo(
    () => (recommendation ? uniqueReasons(recommendation.explanation) : []),
    [recommendation],
  );

  useEffect(() => {
    if (input && recommendation && revealRequest > previousReveal.current) {
      const reduce =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelRef.current?.scrollIntoView?.({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }
    previousReveal.current = revealRequest;
  }, [input, recommendation, revealRequest]);

  const editToolbar = onEditBasket ? (
    <div className="results-shell__toolbar">
      <button
        type="button"
        className="button button--secondary"
        onClick={onEditBasket}
      >
        Edit basket
      </button>
    </div>
  ) : null;

  const startOverAction = onStartOver ? (
    <div className="result-start-over">
      <button
        type="button"
        className="button button--start-over"
        onClick={onStartOver}
      >
        Start over
      </button>
    </div>
  ) : null;

  if (!input || !recommendation || !resultHeadline) {
    return (
      <div className="results-shell">
        {editToolbar}
        <aside ref={panelRef} className="panel panel--recommendation" aria-label="Your smartest shop">
          <div className="section-heading">
            <h1
              ref={headingRef}
              id="results-heading"
              className="step-heading"
              tabIndex={-1}
            >
              Your smartest shop
            </h1>
          </div>
          <div className="recommendation-empty">
            <span className="recommendation-empty__badge" aria-hidden="true">RM</span>
            <h2>Complete your basket to see a recommendation</h2>
            <p>
              Add quantities, prices and every trip estimate,
              then compare the basket.
            </p>
          </div>
          {startOverAction}
        </aside>
      </div>
    );
  }

  if (recommendation.status === "no-valid-plan") {
    return (
      <div className="results-shell">
        {editToolbar}
        <aside
          ref={panelRef}
          className="panel panel--recommendation panel--recommendation-error"
          aria-label="Your smartest shop"
        >
          <div className="result-hero result-hero--error result-hero--compact">
            <div>
              <h1
                ref={headingRef}
                id="results-heading"
                className="step-heading"
                tabIndex={-1}
              >
                {resultHeadline.title}
              </h1>
              <p>{resultHeadline.support}</p>
            </div>
            <p className="visually-hidden" role="status" aria-live="polite">
              {resultHeadline.title}
            </p>
          </div>
          <div className="result-content result-content--compact">
            <div className="no-plan-guidance">
              <h2>How to make a complete plan</h2>
              <p>Add a valid price for the affected item at one of the selected shops.</p>
            </div>
            <Assumptions />
          </div>
          {startOverAction}
        </aside>
      </div>
    );
  }

  const itemNames = new Map(input.items.map(({ id, name }) => [id, name]));
  const comparedPairNames = recommendation.twoStoreComparison?.storeIds.map(
    (id) => input.stores.find((store) => store.id === id)?.name ?? "Unknown shop",
  );

  return (
    <div className="results-shell">
      {editToolbar}
      <aside
        ref={panelRef}
        className={`panel panel--recommendation panel--recommendation-result panel--${resultHeadline.tone}`}
        aria-label="Your smartest shop"
      >
        <div
          className={`result-hero result-hero--${resultHeadline.tone} result-hero--celebrate result-hero--compact`}
        >
          <div>
            <h1
              ref={headingRef}
              id="results-heading"
              className="step-heading"
              tabIndex={-1}
            >
              {resultHeadline.title}
            </h1>
            <p className="result-hero__support">{resultHeadline.support}</p>
          </div>
          <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
            {resultHeadline.title}. {resultHeadline.support}. Final total{" "}
            {formatRm(recommendation.finalTotalCents)}.
          </p>
        </div>

        <div className="result-content result-content--compact">
          <section className="cost-summary" aria-labelledby="cost-summary-heading">
            <div className="cost-summary__total">
              <div>
                <p id="cost-summary-heading">Final total</p>
                <p className="cost-summary__equation">
                  Groceries {formatRm(recommendation.grocerySubtotalCents)}
                  {" + "}
                  Travel {formatRm(recommendation.travelCostCents)}
                </p>
              </div>
              <strong>{formatRm(recommendation.finalTotalCents)}</strong>
            </div>
            <dl className="cost-summary__compare">
              {recommendation.bestSingleStoreTotalCents !== null && (
                <div>
                  <dt>Best single-shop total</dt>
                  <dd>{formatRm(recommendation.bestSingleStoreTotalCents)}</dd>
                </div>
              )}
              {recommendation.netSavingCents !== null && recommendation.netSavingCents > 0 && (
                <div className="cost-summary__saving">
                  <dt>Net saving</dt>
                  <dd>{formatRm(recommendation.netSavingCents)}</dd>
                </div>
              )}
            </dl>
            {recommendation.breakEvenTripCostCents !== null &&
              recommendation.breakEvenTripCostCents > 0 && (
                <details className="break-even-details">
                  <summary>Break-even details</summary>
                  <div className="break-even-details__body">
                    <p className="break-even-details__amount">
                      Break-even combined-trip cost:{" "}
                      <strong>{formatRm(recommendation.breakEvenTripCostCents)}</strong>
                    </p>
                    <ul>
                      {comparedPairNames && (
                        <li>
                          Compared route: <strong>{comparedPairNames.join(" + ")}</strong>
                        </li>
                      )}
                      <li>Below this amount, the pair is cheaper.</li>
                      <li>
                        At the exact amount, JimatCart chooses one shop because the
                        totals tie.
                      </li>
                    </ul>
                  </div>
                </details>
              )}
          </section>

          <section className="purchase-plan" aria-labelledby="purchase-plan-heading">
            <div className="result-section-heading">
              <h2 id="purchase-plan-heading">What to buy where</h2>
              <p>{recommendation.storesUsed.length}-shop plan</p>
            </div>
            <div className="store-plan-list">
              {groups.map((group) => (
                <section
                  className="store-plan"
                  aria-labelledby={`store-${group.storeId}`}
                  key={group.storeId}
                >
                  <div className="store-plan__heading">
                    <h3 id={`store-${group.storeId}`}>{group.storeName}</h3>
                    <span className="store-plan__count">
                      {group.assignments.length} item
                      {group.assignments.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul>
                    {group.assignments.map((assignment) => (
                      <li key={assignment.itemId}>
                        <span>
                          <strong>
                            {itemNames.get(assignment.itemId) ?? "Unknown item"}
                          </strong>
                          <small>Qty {assignment.quantity}</small>
                        </span>
                        <strong>{formatRm(assignment.lineTotalCents)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          {reasons.length > 0 && (
            <section className="why-this-plan why-this-plan--compact" aria-labelledby="why-heading">
              <h2 id="why-heading">Why this plan won</h2>
              <ul>
                {reasons.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          {planText && <ShoppingPlanExport planText={planText} />}
          <Assumptions />
        </div>
        {startOverAction}
      </aside>
    </div>
  );
}
