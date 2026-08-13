import { describe, expect, it } from "vitest";
import {
  EXTRA_STOP_COST_RANGE,
  ITEM_PRICE_RANGE,
  calculateLineTotalCents,
  formatRm,
  parseRmInput,
  validateExtraStopCostCents,
  validateItemPriceCents,
  validateMoneyRange,
} from "../../src/domain";

describe("parseRmInput", () => {
  it.each([
    ["0", 0],
    ["5", 500],
    ["5.5", 550],
    ["5.50", 550],
    [".50", 50],
    ["0005.50", 550],
    ["  12.90  ", 1_290],
    ["9999.99", 999_999],
  ])("parses %j into integer cents", (input, expectedCents) => {
    expect(parseRmInput(input)).toEqual({ ok: true, cents: expectedCents });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    [".", "invalid-format"],
    ["5.", "invalid-format"],
    ["5.555", "invalid-format"],
    ["RM5.50", "invalid-format"],
    ["1,000.00", "invalid-format"],
    ["1e3", "invalid-format"],
    ["-5", "invalid-format"],
    ["+5", "invalid-format"],
    ["0x10", "invalid-format"],
    ["NaN", "invalid-format"],
  ])("rejects %j with %s", (input, expectedCode) => {
    const result = parseRmInput(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(expectedCode);
      expect(result.error.message).not.toHaveLength(0);
    }
  });

  it("reports an amount that cannot be represented safely", () => {
    expect(parseRmInput("90071992547409.92")).toMatchObject({
      ok: false,
      error: { code: "unsafe-value" },
    });
  });

  it("does not apply item or trip field limits while parsing", () => {
    expect(parseRmInput("10000.00")).toEqual({
      ok: true,
      cents: 1_000_000,
    });
  });
});

describe("field-specific money range validation", () => {
  it.each([ITEM_PRICE_RANGE.minCents, ITEM_PRICE_RANGE.maxCents])(
    "accepts item-price boundary %i cents",
    (cents) => {
      expect(validateItemPriceCents(cents)).toEqual({ ok: true, cents });
    },
  );

  it("rejects item prices outside RM0.01–RM9,999.99", () => {
    expect(validateItemPriceCents(0)).toMatchObject({
      ok: false,
      error: { code: "below-minimum" },
    });
    expect(validateItemPriceCents(1_000_000)).toMatchObject({
      ok: false,
      error: { code: "above-maximum" },
    });
  });

  it.each([
    EXTRA_STOP_COST_RANGE.minCents,
    EXTRA_STOP_COST_RANGE.maxCents,
  ])("accepts extra-stop boundary %i cents", (cents) => {
    expect(validateExtraStopCostCents(cents)).toEqual({ ok: true, cents });
  });

  it("rejects extra-stop costs outside RM0.00–RM999.99", () => {
    expect(validateExtraStopCostCents(-1)).toMatchObject({
      ok: false,
      error: { code: "below-minimum" },
    });
    expect(validateExtraStopCostCents(100_000)).toMatchObject({
      ok: false,
      error: { code: "above-maximum" },
    });
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-integer-cent value %s",
    (cents) => {
      expect(validateMoneyRange(cents, ITEM_PRICE_RANGE)).toMatchObject({
        ok: false,
        error: { code: "invalid-cents" },
      });
    },
  );
});

describe("calculateLineTotalCents", () => {
  it("calculates line totals using integer cents", () => {
    expect(calculateLineTotalCents(799, 3)).toEqual({
      ok: true,
      cents: 2_397,
    });
    expect(calculateLineTotalCents(10, 99)).toEqual({
      ok: true,
      cents: 990,
    });
  });

  it.each([0, 100, 1.5, Number.NaN])(
    "rejects out-of-domain quantity %s",
    (quantity) => {
      expect(calculateLineTotalCents(500, quantity)).toMatchObject({
        ok: false,
        error: { code: "invalid-quantity" },
      });
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid unit-price cents %s",
    (unitPriceCents) => {
      expect(calculateLineTotalCents(unitPriceCents, 1)).toMatchObject({
        ok: false,
        error: { code: "invalid-unit-price" },
      });
    },
  );

  it("reports multiplication beyond the safe-integer boundary", () => {
    expect(
      calculateLineTotalCents(Number.MAX_SAFE_INTEGER, 2),
    ).toMatchObject({
      ok: false,
      error: { code: "overflow" },
    });
  });
});

describe("formatRm", () => {
  it.each([
    [0, "RM0.00"],
    [50, "RM0.50"],
    [123_456, "RM1,234.56"],
    [-210, "-RM2.10"],
  ])("formats %i cents as %s", (cents, expected) => {
    expect(formatRm(cents)).toBe(expected);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid internal cents %s",
    (cents) => {
      expect(() => formatRm(cents)).toThrow(RangeError);
    },
  );
});
