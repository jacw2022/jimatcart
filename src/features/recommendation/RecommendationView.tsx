import { useEffect, useMemo, useRef, useState } from "react";
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
}

interface AssignmentGroup {
  storeId: string;
  storeName: string;
  assignments: PurchaseAssignment[];
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

function headline(input: BasketInput, recommendation: Recommendation) {
  if (recommendation.status === "no-valid-plan") {
    return {
      title: "No complete two-shop plan yet",
      summary: recommendation.explanation[0],
      tone: "error",
    } as const;
  }

  const names = recommendation.storesUsed.map(
    (id) => input.stores.find((store) => store.id === id)?.name ?? "Unknown shop",
  );
  if (recommendation.storesUsed.length === 2) {
    if (recommendation.bestSingleStoreTotalCents === null) {
      return {
        title: `Split between ${names.join(" and ")}`,
        summary: "No single shop has a price for every item.",
        tone: "practical",
      } as const;
    }
    return {
      title: `Split between ${names.join(" and ")} to save ${formatRm(
        recommendation.netSavingCents ?? 0,
      )}`,
      summary:
        "The grocery saving remains worthwhile after the combined trip estimate.",
      tone: "success",
    } as const;
  }

  const compared = recommendation.twoStoreComparison;
  if (
    compared &&
    recommendation.breakEvenTripCostCents !== null &&
    compared.travelCostCents === recommendation.breakEvenTripCostCents
  ) {
    return {
      title: `One shop costs the same — buy everything at ${names[0]}`,
      summary: "The totals tie, so JimatCart prefers fewer shops.",
      tone: "practical",
    } as const;
  }
  if (
    compared &&
    recommendation.bestSingleStoreTotalCents !== null &&
    compared.finalTotalCents > recommendation.bestSingleStoreTotalCents
  ) {
    return {
      title: `Buy everything at ${names[0]} — splitting would cost ${formatRm(
        compared.finalTotalCents - recommendation.bestSingleStoreTotalCents,
      )} more`,
      summary:
        "The two-shop groceries cost less, but the combined trip removes that saving.",
      tone: "practical",
    } as const;
  }
  return {
    title: `Buy everything at ${names[0]}`,
    summary: "This shop gives the lowest complete checkout and travel total.",
    tone: "success",
  } as const;
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`result-metric ${emphasis ? "result-metric--emphasis" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ShoppingPlanExport({ planText }: { planText: string }) {
  const [status, setStatus] = useState<ExportStatus>(null);

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
    <div className="shopping-plan-export">
      <div>
        <h4>Take this plan with you</h4>
        <p>Copy the shopping list or download the same plan as a text file.</p>
      </div>
      <div className="shopping-plan-export__actions">
        <button className="button button--primary" type="button" onClick={copyPlan}>
          Copy shopping plan
        </button>
        <button className="button button--secondary" type="button" onClick={downloadPlan}>
          Download shopping plan
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
    <section className="result-assumptions" aria-labelledby="assumptions-heading">
      <h3 id="assumptions-heading">Keep in mind</h3>
      <ul>
        <li>Each item's full quantity is bought from one shop.</li>
        <li>Unit prices and total trip costs are manually entered.</li>
        <li>Brand, quality, stock, promotions and travel time are excluded.</li>
        <li>Shop order is not a route recommendation.</li>
      </ul>
    </section>
  );
}

export function RecommendationView({
  input,
  recommendation,
  revealRequest = 0,
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

  useEffect(() => {
    if (input && recommendation && revealRequest > previousReveal.current) {
      panelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
    previousReveal.current = revealRequest;
  }, [input, recommendation, revealRequest]);

  if (!input || !recommendation || !resultHeadline) {
    return (
      <aside ref={panelRef} className="panel panel--recommendation" aria-label="Your smartest shop">
        <div className="section-heading">
          <p className="step-label">Step 2</p>
          <h2>Your smartest shop</h2>
        </div>
        <div className="recommendation-empty">
          <span className="recommendation-empty__badge" aria-hidden="true">RM</span>
          <h3>Complete your basket to see a recommendation</h3>
          <p>
            Add quantities, prices and every trip estimate,
            then compare the basket.
          </p>
        </div>
        <div className="notice" role="note">
          <span className="notice__marker" aria-hidden="true">i</span>
          <p>Every plan includes quantity-based grocery costs and its total trip estimate.</p>
        </div>
      </aside>
    );
  }

  if (recommendation.status === "no-valid-plan") {
    return (
      <aside
        ref={panelRef}
        className="panel panel--recommendation panel--recommendation-error"
        aria-label="Your smartest shop"
      >
        <div className="result-hero result-hero--error">
          <p className="step-label">Step 2</p>
          <div>
            <h2>{resultHeadline.title}</h2>
            <p>{resultHeadline.summary}</p>
          </div>
          <p className="visually-hidden" role="status" aria-live="polite">
            {resultHeadline.title}
          </p>
        </div>
        <div className="no-plan-guidance">
          <h3>How to make a complete plan</h3>
          <p>Add a valid price for the affected item at one of the selected shops.</p>
        </div>
        <Assumptions />
      </aside>
    );
  }

  const itemNames = new Map(input.items.map(({ id, name }) => [id, name]));
  const comparedPairNames = recommendation.twoStoreComparison?.storeIds.map(
    (id) => input.stores.find((store) => store.id === id)?.name ?? "Unknown shop",
  );

  return (
    <aside
      ref={panelRef}
      className={`panel panel--recommendation panel--recommendation-result panel--${resultHeadline.tone}`}
      aria-label="Your smartest shop"
    >
      <div className={`result-hero result-hero--${resultHeadline.tone}`}>
        <p className="step-label">Step 2</p>
        <div>
          <h2>{resultHeadline.title}</h2>
          <p>{resultHeadline.summary}</p>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {resultHeadline.title}. Final total {formatRm(recommendation.finalTotalCents)}.
        </p>
      </div>

      <div className="result-content">
        <section className="purchase-plan" aria-labelledby="purchase-plan-heading">
          <div className="result-section-heading">
            <h3 id="purchase-plan-heading">What to buy where</h3>
            <p>{recommendation.storesUsed.length} shop plan</p>
          </div>
          <div className="store-plan-list">
            {groups.map((group) => (
              <section className="store-plan" aria-labelledby={`store-${group.storeId}`} key={group.storeId}>
                <div className="store-plan__heading">
                  <h4 id={`store-${group.storeId}`}>{group.storeName}</h4>
                </div>
                <ul>
                  {group.assignments.map((assignment) => {
                    return (
                      <li key={assignment.itemId}>
                        <span>
                          <strong>{itemNames.get(assignment.itemId) ?? "Unknown item"}</strong>
                          <small>Quantity {assignment.quantity}</small>
                        </span>
                        <strong>{formatRm(assignment.lineTotalCents)}</strong>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="cost-breakdown" aria-labelledby="cost-breakdown-heading">
          <div className="cost-breakdown__heading">
            <h3 id="cost-breakdown-heading">Cost breakdown</h3>
          </div>
          <dl className="result-metrics">
            <Metric label="Grocery checkout" value={formatRm(recommendation.grocerySubtotalCents)} />
            <Metric label="Estimated travel" value={formatRm(recommendation.travelCostCents)} />
            <Metric label="Final total" value={formatRm(recommendation.finalTotalCents)} emphasis />
            {recommendation.bestSingleStoreTotalCents !== null && (
              <Metric label="Best single-shop final total" value={formatRm(recommendation.bestSingleStoreTotalCents)} />
            )}
            {recommendation.netSavingCents !== null && recommendation.netSavingCents > 0 && (
              <Metric label="Net saving" value={formatRm(recommendation.netSavingCents)} />
            )}
          </dl>

          {recommendation.breakEvenTripCostCents !== null &&
            recommendation.breakEvenTripCostCents > 0 && (
              <div className="break-even-note">
                <strong>
                  Break-even combined-trip cost: {formatRm(recommendation.breakEvenTripCostCents)}
                </strong>
                <p>
                  {comparedPairNames && `For ${comparedPairNames.join(" and ")}, `}
                  below this amount the pair is cheaper. At the exact amount,
                  JimatCart chooses one shop because the totals tie.
                </p>
              </div>
            )}
          {planText && <ShoppingPlanExport planText={planText} />}
        </section>

        <section className="why-this-plan" aria-labelledby="why-heading">
          <h3 id="why-heading">Why this plan won</h3>
          <ul>
            {recommendation.explanation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <Assumptions />
      </div>
    </aside>
  );
}
