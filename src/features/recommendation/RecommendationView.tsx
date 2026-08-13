import { useEffect, useMemo, useRef } from "react";
import { formatRm } from "../../domain";
import type {
  BasketInput,
  PurchaseAssignment,
  Recommendation,
} from "../../domain";

interface RecommendationViewProps {
  input: BasketInput | null;
  recommendation: Recommendation | null;
}

interface GroupedAssignments {
  storeId: string;
  storeName: string;
  assignments: PurchaseAssignment[];
}

interface Headline {
  eyebrow: string;
  title: string;
  summary: string;
  tone: "success" | "practical" | "unavoidable" | "error";
}

function groupAssignments(
  input: BasketInput,
  recommendation: Recommendation,
): GroupedAssignments[] {
  const storeNames = new Map(
    input.stores.map((store) => [store.id, store.name]),
  );

  return recommendation.storesUsed.map((storeId) => ({
    storeId,
    storeName: storeNames.get(storeId) ?? "Unknown shop",
    assignments: recommendation.assignments.filter(
      (assignment) => assignment.storeId === storeId,
    ),
  }));
}

function getHeadline(
  input: BasketInput,
  recommendation: Recommendation,
): Headline {
  if (recommendation.status === "no-valid-plan") {
    return {
      eyebrow: "No complete plan",
      title: "This basket needs another price option",
      summary:
        recommendation.explanation[0] ??
        "No one- or two-shop plan can cover every item.",
      tone: "error",
    };
  }

  const storeNames = recommendation.storesUsed.map(
    (storeId) =>
      input.stores.find((store) => store.id === storeId)?.name ?? "Unknown shop",
  );

  if (recommendation.bestSingleStoreTotalCents === null) {
    return {
      eyebrow: "Two stops required",
      title: `Split between ${storeNames.join(" and ")}`,
      summary:
        "No single shop has every item, so this is the cheapest complete two-shop plan.",
      tone: "unavoidable",
    };
  }

  if (
    recommendation.storesUsed.length === 2 &&
    recommendation.netSavingCents !== null &&
    recommendation.netSavingCents > 0
  ) {
    return {
      eyebrow: "Best value",
      title: `Split between ${storeNames.join(" and ")} to save ${formatRm(
        recommendation.netSavingCents,
      )}`,
      summary:
        "The grocery saving is still worthwhile after including your extra-stop estimate.",
      tone: "success",
    };
  }

  if (
    recommendation.breakEvenExtraCostCents !== null &&
    recommendation.breakEvenExtraCostCents > 0 &&
    input.extraStopCostCents === recommendation.breakEvenExtraCostCents
  ) {
    return {
      eyebrow: "Same total, simpler trip",
      title: `One shop costs the same — buy everything at ${storeNames[0]}`,
      summary:
        "The one- and two-shop plans cost the same, so JimatCart prefers fewer stops.",
      tone: "practical",
    };
  }

  if (
    recommendation.breakEvenExtraCostCents !== null &&
    recommendation.breakEvenExtraCostCents > 0 &&
    input.extraStopCostCents > recommendation.breakEvenExtraCostCents
  ) {
    const splitExtraCostCents =
      input.extraStopCostCents - recommendation.breakEvenExtraCostCents;

    return {
      eyebrow: "One stop wins overall",
      title: `Buy everything at ${storeNames[0]} — splitting would cost ${formatRm(
        splitExtraCostCents,
      )} more`,
      summary:
        "The split basket is cheaper before travel, but the extra stop removes that saving.",
      tone: "practical",
    };
  }

  return {
    eyebrow: "Cheapest complete plan",
    title: `Buy everything at ${storeNames[0]}`,
    summary: "One shop gives you the lowest complete total for this basket.",
    tone: "success",
  };
}

function Metric({ label, value, emphasis = false }: {
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

export function RecommendationView({
  input,
  recommendation,
}: RecommendationViewProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previouslyHadResult = useRef(Boolean(input && recommendation));
  const headline = useMemo(
    () =>
      input && recommendation ? getHeadline(input, recommendation) : null,
    [input, recommendation],
  );
  const groupedAssignments = useMemo(
    () =>
      input && recommendation?.status === "success"
        ? groupAssignments(input, recommendation)
        : [],
    [input, recommendation],
  );

  useEffect(() => {
    const hasResult = Boolean(input && recommendation);

    if (hasResult && !previouslyHadResult.current) {
      panelRef.current?.scrollIntoView?.({ block: "start" });
    }

    previouslyHadResult.current = hasResult;
  }, [input, recommendation]);

  if (!input || !recommendation || !headline) {
    return (
      <aside
        ref={panelRef}
        className="panel panel--recommendation"
        aria-label="Your smartest shop"
      >
        <div className="section-heading">
          <p className="step-label">Step 2</p>
          <h2 id="recommendation-heading">Your smartest shop</h2>
        </div>

        <div className="recommendation-empty">
          <span className="recommendation-empty__badge" aria-hidden="true">
            RM
          </span>
          <h3>Complete your basket to see a recommendation</h3>
          <p>
            Add valid names, quantities, and at least one price for every item.
            JimatCart will update the plan as soon as the basket is ready.
          </p>
        </div>

        <div className="notice" role="note" aria-label="How recommendations work">
          <span className="notice__marker" aria-hidden="true">
            i
          </span>
          <p>
            Every plan uses the prices you enter and includes your estimated
            cost of making an extra stop.
          </p>
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
          <p className="step-label">Step 2 · {headline.eyebrow}</p>
          <div>
            <h2 id="recommendation-heading">{headline.title}</h2>
            <p>{headline.summary}</p>
          </div>
          <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
            {headline.title}
          </p>
        </div>

        <div className="no-plan-guidance">
          <h3>How to make a complete plan</h3>
          <p>
            Add another shop price for one of the affected items so the basket
            can be covered in no more than two stops.
          </p>
        </div>

        <Assumptions />
      </aside>
    );
  }

  const itemNames = new Map(input.items.map((item) => [item.id, item.name]));
  const splitExtraCostCents =
    recommendation.storesUsed.length === 1 &&
    recommendation.breakEvenExtraCostCents !== null &&
    recommendation.breakEvenExtraCostCents > 0 &&
    input.extraStopCostCents > recommendation.breakEvenExtraCostCents
      ? input.extraStopCostCents - recommendation.breakEvenExtraCostCents
      : null;

  return (
    <aside
      ref={panelRef}
      className={`panel panel--recommendation panel--recommendation-result panel--${headline.tone}`}
      aria-label="Your smartest shop"
    >
      <div className={`result-hero result-hero--${headline.tone}`}>
        <p className="step-label">Step 2 · {headline.eyebrow}</p>
        <div>
          <h2 id="recommendation-heading">{headline.title}</h2>
          <p>{headline.summary}</p>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {headline.title}. Final total {formatRm(recommendation.finalTotalCents)}.
        </p>
      </div>

      <div className="result-content">
        <section className="purchase-plan" aria-labelledby="purchase-plan-heading">
          <div className="result-section-heading">
            <h3 id="purchase-plan-heading">What to buy where</h3>
            <p>{recommendation.storesUsed.length} shop plan</p>
          </div>

          <div className="store-plan-list">
            {groupedAssignments.map((group, index) => (
              <section
                className="store-plan"
                aria-labelledby={`store-plan-${group.storeId}`}
                key={group.storeId}
              >
                <div className="store-plan__heading">
                  <span aria-hidden="true">{index + 1}</span>
                  <h4 id={`store-plan-${group.storeId}`}>{group.storeName}</h4>
                </div>
                <ul>
                  {group.assignments.map((assignment) => (
                    <li key={assignment.itemId}>
                      <span>
                        {itemNames.get(assignment.itemId) ?? "Unknown item"}
                        <small>Quantity {assignment.quantity}</small>
                      </span>
                      <strong>{formatRm(assignment.lineTotalCents)}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="cost-breakdown" aria-labelledby="cost-breakdown-heading">
          <h3 id="cost-breakdown-heading">Cost breakdown</h3>
          <dl className="result-metrics">
            <Metric
              label="Groceries"
              value={formatRm(recommendation.grocerySubtotalCents)}
            />
            <Metric
              label="Extra stop"
              value={formatRm(recommendation.extraStopCostCents)}
            />
            <Metric
              label="Final total"
              value={formatRm(recommendation.finalTotalCents)}
              emphasis
            />
            {recommendation.bestSingleStoreTotalCents !== null && (
              <Metric
                label="Best single shop"
                value={formatRm(recommendation.bestSingleStoreTotalCents)}
              />
            )}
            {recommendation.netSavingCents !== null &&
              recommendation.netSavingCents > 0 && (
                <Metric
                  label="Net saving"
                  value={formatRm(recommendation.netSavingCents)}
                />
              )}
            {splitExtraCostCents !== null && (
              <Metric
                label="Extra cost if split"
                value={formatRm(splitExtraCostCents)}
              />
            )}
            {recommendation.netSavingCents === 0 &&
              splitExtraCostCents === null && (
                <Metric label="Net saving" value={formatRm(0)} />
              )}
          </dl>

          {recommendation.breakEvenExtraCostCents !== null &&
            recommendation.breakEvenExtraCostCents > 0 && (
              <div className="break-even-note">
                <strong>
                  Break-even extra-stop cost: {formatRm(
                    recommendation.breakEvenExtraCostCents,
                  )}
                </strong>
                <p>
                  Below this amount, the split is cheaper. At this exact amount,
                  JimatCart chooses one shop because the totals tie.
                </p>
              </div>
            )}
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

function Assumptions() {
  return (
    <section className="result-assumptions" aria-labelledby="assumptions-heading">
      <h3 id="assumptions-heading">Keep in mind</h3>
      <ul>
        <li>Prices and availability are based on what you entered.</li>
        <li>The extra-stop cost is your estimate, not a route calculation.</li>
        <li>Discounts, loyalty rewards, stock changes, and travel time are excluded.</li>
      </ul>
    </section>
  );
}
