import type { MoneyCents } from "./types";

export const ITEM_PRICE_RANGE = Object.freeze({
  minCents: 1,
  maxCents: 999_999,
});

export const TRIP_COST_RANGE = Object.freeze({
  minCents: 0,
  maxCents: 99_999,
});

export const ITEM_QUANTITY_RANGE = Object.freeze({
  min: 1,
  max: 99,
});

export type MoneyParseErrorCode =
  | "empty"
  | "invalid-format"
  | "unsafe-value";

export type MoneyParseResult =
  | { ok: true; cents: MoneyCents }
  | {
      ok: false;
      error: { code: MoneyParseErrorCode; message: string };
    };

export type MoneyRangeErrorCode =
  | "invalid-cents"
  | "below-minimum"
  | "above-maximum";

export type MoneyRangeResult =
  | { ok: true; cents: MoneyCents }
  | {
      ok: false;
      error: { code: MoneyRangeErrorCode; message: string };
    };

export type LineTotalErrorCode =
  | "invalid-unit-price"
  | "invalid-quantity"
  | "overflow";

export type LineTotalResult =
  | { ok: true; cents: MoneyCents }
  | {
      ok: false;
      error: { code: LineTotalErrorCode; message: string };
    };

export interface MoneyRange {
  minCents: MoneyCents;
  maxCents: MoneyCents;
}

const editableRmPattern = /^(?:(\d+)(?:\.(\d{1,2}))?|\.(\d{1,2}))$/;
const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);

const rmFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isSafeIntegerCents(value: number): boolean {
  return Number.isSafeInteger(value);
}

/**
 * Parses editable, non-negative RM text without using floating-point
 * multiplication. Syntax parsing is intentionally separate from field limits.
 */
export function parseRmInput(input: string): MoneyParseResult {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return {
      ok: false,
      error: {
        code: "empty",
        message: "Enter an amount.",
      },
    };
  }

  const match = editableRmPattern.exec(trimmedInput);

  if (!match) {
    return {
      ok: false,
      error: {
        code: "invalid-format",
        message: "Use digits with no more than two decimal places.",
      },
    };
  }

  const wholeRinggitDigits = match[1] ?? "0";
  const fractionalDigits = match[2] ?? match[3] ?? "";
  const senDigits = fractionalDigits.padEnd(2, "0");
  const cents =
    BigInt(wholeRinggitDigits) * 100n + BigInt(senDigits.length > 0 ? senDigits : "0");

  if (cents > maxSafeInteger) {
    return {
      ok: false,
      error: {
        code: "unsafe-value",
        message: "This amount is too large to calculate safely.",
      },
    };
  }

  return { ok: true, cents: Number(cents) };
}

/** Validates already-parsed cents against a field-specific inclusive range. */
export function validateMoneyRange(
  cents: MoneyCents,
  range: MoneyRange,
): MoneyRangeResult {
  if (!isSafeIntegerCents(cents)) {
    return {
      ok: false,
      error: {
        code: "invalid-cents",
        message: "The amount must be represented as whole cents.",
      },
    };
  }

  if (cents < range.minCents) {
    return {
      ok: false,
      error: {
        code: "below-minimum",
        message: `The amount must be at least ${formatRm(range.minCents)}.`,
      },
    };
  }

  if (cents > range.maxCents) {
    return {
      ok: false,
      error: {
        code: "above-maximum",
        message: `The amount must not exceed ${formatRm(range.maxCents)}.`,
      },
    };
  }

  return { ok: true, cents };
}

export function validateItemPriceCents(cents: MoneyCents): MoneyRangeResult {
  return validateMoneyRange(cents, ITEM_PRICE_RANGE);
}

export function validateTripCostCents(cents: MoneyCents): MoneyRangeResult {
  return validateMoneyRange(cents, TRIP_COST_RANGE);
}

/**
 * Multiplies a valid non-negative unit price by a domain-valid quantity while
 * preventing unsafe-integer overflow.
 */
export function calculateLineTotalCents(
  unitPriceCents: MoneyCents,
  quantity: number,
): LineTotalResult {
  if (!isSafeIntegerCents(unitPriceCents) || unitPriceCents < 0) {
    return {
      ok: false,
      error: {
        code: "invalid-unit-price",
        message: "The unit price must be a non-negative whole-cent amount.",
      },
    };
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < ITEM_QUANTITY_RANGE.min ||
    quantity > ITEM_QUANTITY_RANGE.max
  ) {
    return {
      ok: false,
      error: {
        code: "invalid-quantity",
        message: `Quantity must be a whole number from ${ITEM_QUANTITY_RANGE.min} to ${ITEM_QUANTITY_RANGE.max}.`,
      },
    };
  }

  const lineTotalCents = unitPriceCents * quantity;

  if (!Number.isSafeInteger(lineTotalCents)) {
    return {
      ok: false,
      error: {
        code: "overflow",
        message: "This line total is too large to calculate safely.",
      },
    };
  }

  return { ok: true, cents: lineTotalCents };
}

/** Formats signed, safe integer cents for display as Malaysian ringgit. */
export function formatRm(cents: MoneyCents): string {
  if (!isSafeIntegerCents(cents)) {
    throw new RangeError("RM values must be represented as safe integer cents.");
  }

  return rmFormatter.format(cents / 100).replace(/\s/g, "");
}
