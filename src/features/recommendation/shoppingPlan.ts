import { formatRm } from "../../domain";
import type { BasketInput, Recommendation } from "../../domain";

function printableName(name: string, fallback: string): string {
  return name.replace(/[\r\n]+/g, " ").trim() || fallback;
}

function comparisonLines(recommendation: Recommendation): string[] {
  if (recommendation.bestSingleStoreTotalCents === null) {
    return [
      "Single-shop comparison: unavailable because no single shop covers every item.",
      "Break-even combined-trip cost: unavailable without a complete single-shop plan.",
    ];
  }

  const lines = [
    `Best single-shop final total: ${formatRm(recommendation.bestSingleStoreTotalCents)}`,
  ];
  if (recommendation.netSavingCents !== null) {
    lines.push(
      recommendation.netSavingCents >= 0
        ? `Net saving: ${formatRm(recommendation.netSavingCents)}`
        : `Extra cost: ${formatRm(Math.abs(recommendation.netSavingCents))}`,
    );
  }
  if (recommendation.breakEvenTripCostCents === null) {
    lines.push("Break-even combined-trip cost: not applicable.");
  } else if (recommendation.breakEvenTripCostCents <= 0) {
    lines.push(
      "Break-even combined-trip cost: none; the two-shop groceries are not cheaper.",
    );
  } else {
    lines.push(
      `Break-even combined-trip cost: ${formatRm(recommendation.breakEvenTripCostCents)}. Below this amount, the compared pair is cheaper; at this amount, one shop wins the tie.`,
    );
  }
  return lines;
}

export function buildShoppingPlanText(
  input: BasketInput,
  recommendation: Recommendation,
): string | null {
  if (recommendation.status !== "success") return null;

  const storeNames = new Map(
    input.stores.map(({ id, name }) => [id, printableName(name, "Unknown shop")]),
  );
  const itemNames = new Map(
    input.items.map(({ id, name }) => [id, printableName(name, "Unknown item")]),
  );
  const lines = [
    `JimatCart shopping plan — ${recommendation.storesUsed
      .map((id) => storeNames.get(id) ?? "Unknown shop")
      .join(" and ")}`,
  ];

  for (const storeId of recommendation.storesUsed) {
    lines.push("", storeNames.get(storeId) ?? "Unknown shop");
    recommendation.assignments
      .filter((assignment) => assignment.storeId === storeId)
      .forEach((assignment) => {
        lines.push(
          `- ${itemNames.get(assignment.itemId) ?? "Unknown item"}: quantity ${assignment.quantity} — ${formatRm(assignment.lineTotalCents)}`,
        );
      });
  }

  lines.push(
    "",
    "Cost summary",
    `Grocery checkout subtotal: ${formatRm(recommendation.grocerySubtotalCents)}`,
    `Estimated travel cost: ${formatRm(recommendation.travelCostCents)}`,
    `Final total: ${formatRm(recommendation.finalTotalCents)}`,
    ...comparisonLines(recommendation),
  );

  if (recommendation.reasons.length > 0) {
    lines.push("", "Why this plan");
    for (const reason of recommendation.reasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push(
    "",
    "Prices and travel estimates were entered manually. Check current prices and availability before shopping.",
  );
  return lines.join("\n");
}
