import { quotesToPriceMap, nearestPrice, runCorrelation, runLagImpactGrouped, runLagImpactSingle } from "./correlationCore";
import type { Quote } from "../../../types/index";

function makeQuote(date: string, close: number): Quote {
  return { date, open: close, high: close, low: close, close, volume: 1000 } as Quote;
}

const QUOTES: Quote[] = [
  makeQuote("2024-01-02", 100),
  makeQuote("2024-01-03", 105),
  makeQuote("2024-01-04", 110),
  makeQuote("2024-01-05", 108),
  makeQuote("2024-01-08", 115),
  makeQuote("2024-01-09", 120),
  makeQuote("2024-01-10", 118),
  makeQuote("2024-01-11", 125),
  makeQuote("2024-01-12", 130),
  makeQuote("2024-01-15", 128),
];

describe("quotesToPriceMap", () => {
  it("builds a date-keyed map from quotes", () => {
    const map = quotesToPriceMap(QUOTES);
    expect(map.get("2024-01-02")).toBe(100);
    expect(map.get("2024-01-03")).toBe(105);
  });

  it("returns empty map for empty quotes", () => {
    expect(quotesToPriceMap([])).toEqual(new Map());
  });

  it("ignores quotes with null close", () => {
    const q = { date: "2024-01-02", open: 100, high: 100, low: 100, close: null, volume: 0 } as unknown as Quote;
    const map = quotesToPriceMap([q]);
    expect(map.size).toBe(0);
  });

  it("uses only the first 10 characters of date string", () => {
    const q = makeQuote("2024-01-02T00:00:00.000Z", 99);
    const map = quotesToPriceMap([q]);
    expect(map.get("2024-01-02")).toBe(99);
  });
});

describe("nearestPrice", () => {
  const priceMap = quotesToPriceMap(QUOTES);

  it("returns exact match when date is in map", () => {
    const result = nearestPrice(priceMap, "2024-01-02");
    expect(result).toEqual({ price: 100, day: "2024-01-02" });
  });

  it("returns next available day within maxOffset", () => {
    // 2024-01-06 is Saturday (not in map), should find 2024-01-08 (Monday) within offset 4
    const result = nearestPrice(priceMap, "2024-01-06", 4);
    expect(result?.price).toBe(115);
    expect(result?.day).toBe("2024-01-08");
  });

  it("returns null when no price found within offset", () => {
    const result = nearestPrice(priceMap, "2023-12-01", 2);
    expect(result).toBeNull();
  });

  it("returns null for empty price map", () => {
    expect(nearestPrice(new Map(), "2024-01-02")).toBeNull();
  });

  it("returns null when maxOffset=0 and date is not in map", () => {
    const result = nearestPrice(priceMap, "2024-01-06", 0);
    expect(result).toBeNull();
  });

  it("returns exact match when maxOffset=0 and date is in map", () => {
    const result = nearestPrice(priceMap, "2024-01-02", 0);
    expect(result).toEqual({ price: 100, day: "2024-01-02" });
  });
});

describe("runCorrelation", () => {
  const positiveDayValues = [
    { day: "2024-01-02", value: 1 },
    { day: "2024-01-03", value: 2 },
    { day: "2024-01-04", value: 1.5 },
    { day: "2024-01-05", value: -0.5 },
    { day: "2024-01-08", value: 3 },
    { day: "2024-01-09", value: 2.5 },
    { day: "2024-01-10", value: -1 },
    { day: "2024-01-11", value: 2 },
  ];

  it("returns a CorrelationResult with required fields", () => {
    const result = runCorrelation(positiveDayValues, QUOTES, { lagDays: 1, source: "test" });
    expect(result).toHaveProperty("r");
    expect(result).toHaveProperty("pValue");
    expect(result).toHaveProperty("significant");
    expect(result).toHaveProperty("ci");
    expect(result).toHaveProperty("n");
    expect(result).toHaveProperty("lagDays", 1);
    expect(result).toHaveProperty("source", "test");
    expect(result).toHaveProperty("interpretation");
  });

  it("r is between -1 and 1", () => {
    const result = runCorrelation(positiveDayValues, QUOTES, { lagDays: 1 });
    expect(result.r).toBeGreaterThanOrEqual(-1);
    expect(result.r).toBeLessThanOrEqual(1);
  });

  it("pValue is between 0 and 1", () => {
    const result = runCorrelation(positiveDayValues, QUOTES, { lagDays: 1 });
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });

  it("n equals number of days that had both a base and lagged price", () => {
    const result = runCorrelation(positiveDayValues, QUOTES, { lagDays: 1 });
    // All 8 input days have a next-day price within maxOffset=4 (including weekends bridged)
    expect(result.n).toBe(8);
  });

  it("returns r ≈ 1.0 for perfectly positively correlated data", () => {
    // Correlates value[day] with pct_change(price[day+1] / price[day]).
    // To get r=1, percent changes must be exactly proportional to values.
    // values: 1,2,3,4 → pct changes must also be 1,2,3,4 (or any linear transform).
    // price[t+1] = price[t] * (1 + value[t]/100)
    const dayValues = [
      { day: "2024-01-02", value: 1 },
      { day: "2024-01-03", value: 2 },
      { day: "2024-01-04", value: 3 },
      { day: "2024-01-08", value: 4 },
    ];
    const p0 = 100;
    const quotes = [
      makeQuote("2024-01-02", p0),
      makeQuote("2024-01-03", p0 * 1.01),
      makeQuote("2024-01-04", p0 * 1.01 * 1.02),
      makeQuote("2024-01-08", p0 * 1.01 * 1.02 * 1.03),
      makeQuote("2024-01-09", p0 * 1.01 * 1.02 * 1.03 * 1.04),
    ];
    const result = runCorrelation(dayValues, quotes, { lagDays: 1 });
    expect(result.r).toBeCloseTo(1.0, 5);
  });

  it("returns r ≈ -1.0 for perfectly negatively correlated data", () => {
    // values increase 1→4, percent changes decrease 4→1 (perfect negative linear relation)
    const dayValues = [
      { day: "2024-01-02", value: 1 },
      { day: "2024-01-03", value: 2 },
      { day: "2024-01-04", value: 3 },
      { day: "2024-01-08", value: 4 },
    ];
    const p0 = 100;
    const quotes = [
      makeQuote("2024-01-02", p0),
      makeQuote("2024-01-03", p0 * 1.04),
      makeQuote("2024-01-04", p0 * 1.04 * 1.03),
      makeQuote("2024-01-08", p0 * 1.04 * 1.03 * 1.02),
      makeQuote("2024-01-09", p0 * 1.04 * 1.03 * 1.02 * 1.01),
    ];
    const result = runCorrelation(dayValues, quotes, { lagDays: 1 });
    expect(result.r).toBeCloseTo(-1.0, 5);
  });

  it("throws when fewer than 4 overlapping data points", () => {
    const sparse = [{ day: "2024-01-02", value: 1 }, { day: "2024-01-03", value: 2 }];
    expect(() => runCorrelation(sparse, QUOTES, { lagDays: 1 })).toThrow("Not enough overlapping data points");
  });

  it("uses lagDays=1 as default", () => {
    const result = runCorrelation(positiveDayValues, QUOTES);
    expect(result.lagDays).toBe(1);
  });

  it("lagDays=0 measures same-day price change", () => {
    // lagDays=0 → base and lagged are the same day → price change is always 0% → r is undefined/NaN
    // The library may throw or return NaN; we just verify it doesn't silently return lagDays=1
    const result = runCorrelation(positiveDayValues, QUOTES, { lagDays: 0 });
    expect(result.lagDays).toBe(0);
  });

  it("interpretation contains source name", () => {
    const result = runCorrelation(positiveDayValues, QUOTES, { source: "trump_posts" });
    expect(result.interpretation).toContain("trump_posts");
  });
});

describe("runLagImpactGrouped", () => {
  const buckets = [
    { day: "2024-01-02", bucket: "positive" as const },
    { day: "2024-01-03", bucket: "negative" as const },
    { day: "2024-01-04", bucket: "neutral" as const },
    { day: "2024-01-08", bucket: "positive" as const },
    { day: "2024-01-09", bucket: "negative" as const },
  ];

  it("returns result with windowDays and three bucket groups", () => {
    const result = runLagImpactGrouped(buckets, QUOTES, { windowDays: 5 });
    expect(result).toHaveProperty("windowDays", 5);
    expect(result).toHaveProperty("positive");
    expect(result).toHaveProperty("negative");
    expect(result).toHaveProperty("neutral");
  });

  it("counts each bucket correctly", () => {
    // fixture: 2 positive, 2 negative, 1 neutral — all have prices in QUOTES
    const result = runLagImpactGrouped(buckets, QUOTES, { windowDays: 3 });
    expect(result.positive.n).toBe(2);
    expect(result.negative.n).toBe(2);
    expect(result.neutral.n).toBe(1);
  });

  it("avgChangePct is a number when bucket has data", () => {
    const result = runLagImpactGrouped(buckets, QUOTES, { windowDays: 3 });
    expect(typeof result.positive.avgChangePct).toBe("number");
    expect(typeof result.negative.avgChangePct).toBe("number");
    expect(typeof result.neutral.avgChangePct).toBe("number");
  });

  it("avgChangePct reflects rising prices for consistently up-trending positive events", () => {
    // Prices strictly increasing: positive events should yield positive avgChangePct
    const risingQuotes = [
      makeQuote("2024-01-02", 100), makeQuote("2024-01-03", 110),
      makeQuote("2024-01-04", 120), makeQuote("2024-01-08", 130),
      makeQuote("2024-01-09", 140), makeQuote("2024-01-10", 150),
    ];
    const posOnly = [
      { day: "2024-01-02", bucket: "positive" as const },
      { day: "2024-01-04", bucket: "positive" as const },
    ];
    const result = runLagImpactGrouped(posOnly, risingQuotes, { windowDays: 2 });
    expect(result.positive.avgChangePct).toBeGreaterThan(0);
  });

  it("avgChangePct is null when no data for a bucket", () => {
    const onlyPositive = [{ day: "2024-01-02", bucket: "positive" as const }];
    const result = runLagImpactGrouped(onlyPositive, QUOTES, { windowDays: 1 });
    expect(result.negative.avgChangePct).toBeNull();
    expect(result.neutral.avgChangePct).toBeNull();
  });
});

describe("runLagImpactSingle", () => {
  const dates = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-08", "2024-01-09"];

  it("returns windowDays, n, and avgChangePct", () => {
    const result = runLagImpactSingle(dates, QUOTES, { windowDays: 3 });
    expect(result).toHaveProperty("windowDays", 3);
    expect(result).toHaveProperty("n");
    expect(result).toHaveProperty("avgChangePct");
  });

  it("deduplicates input dates", () => {
    const duped = [...dates, ...dates];
    const result = runLagImpactSingle(duped, QUOTES, { windowDays: 3 });
    const unique = runLagImpactSingle(dates, QUOTES, { windowDays: 3 });
    expect(result.n).toBe(unique.n);
  });

  it("returns null avgChangePct for empty dates", () => {
    const result = runLagImpactSingle([], QUOTES, { windowDays: 3 });
    expect(result.avgChangePct).toBeNull();
    expect(result.n).toBe(0);
  });
});
