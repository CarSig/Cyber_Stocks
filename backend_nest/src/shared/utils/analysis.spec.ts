import { analyzeHistory, compareHistories } from "./analysis";
import type { Quote } from "../../types/index";

function makeQuote(date: string, open: number, close: number): Quote {
  return { date, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: 1000 } as Quote;
}

const QUOTES: Quote[] = [
  makeQuote("2024-01-02", 100, 105),
  makeQuote("2024-01-03", 106, 110),
  makeQuote("2024-01-04", 111, 108),
  makeQuote("2024-01-05", 109, 120), // biggest same-day swing (11)
  makeQuote("2024-01-08", 121, 122),
];

function makeHistory(quotes: Quote[]) {
  return { quotes };
}

describe("analyzeHistory", () => {
  it("returns biggestSameDayDiff and biggestNextDayDiff", () => {
    const result = analyzeHistory(makeHistory(QUOTES));
    expect(result).toHaveProperty("biggestSameDayDiff");
    expect(result).toHaveProperty("biggestNextDayDiff");
  });

  it("biggestSameDayDiff picks the quote with the largest |open - close|", () => {
    const result = analyzeHistory(makeHistory(QUOTES));
    // 2024-01-05 has open=109, close=120 → diff=11, largest
    expect(result.biggestSameDayDiff.date).toBe("2024-01-05");
    expect(result.biggestSameDayDiff.difference).toBe("10.09%");
  });

  it("biggestNextDayDiff returns a pair of consecutive quotes", () => {
    const result = analyzeHistory(makeHistory(QUOTES));
    const [q1, q2] = result.biggestNextDayDiff;
    expect(q1).toBeDefined();
    expect(q2).toBeDefined();
    // consecutive — q2 should be the next index
    const idx1 = QUOTES.findIndex((q) => q.date === q1.date);
    const idx2 = QUOTES.findIndex((q) => q.date === q2.date);
    expect(idx2).toBe(idx1 + 1);
  });

  it("handles Date objects in quote.date", () => {
    const quotesWithDateObj = [
      { date: new Date("2024-01-02"), open: 100, high: 110, low: 90, close: 105, volume: 1000 } as unknown as Quote,
      { date: new Date("2024-01-03"), open: 106, high: 115, low: 100, close: 110, volume: 1000 } as unknown as Quote,
    ];
    expect(() => analyzeHistory(makeHistory(quotesWithDateObj))).not.toThrow();
  });
});

describe("compareHistories", () => {
  const h1 = makeHistory([
    makeQuote("2024-01-02", 100, 100),
    makeQuote("2024-01-03", 200, 200),
    makeQuote("2024-01-04", 300, 300),
  ]);
  const h2 = makeHistory([
    makeQuote("2024-01-02", 50, 50),
    makeQuote("2024-01-03", 100, 100),
    makeQuote("2024-01-04", 150, 150),
  ]);

  it("returns one row per aligned quote pair", () => {
    const result = compareHistories(h1, "A", h2, "B");
    expect(result).toHaveLength(3);
  });

  it("each row contains name1, price1, name2, price2, difference", () => {
    const result = compareHistories(h1, "Alpha", h2, "Beta");
    expect(result[0]).toMatchObject({
      name1: "Alpha",
      price1: 100,
      name2: "Beta",
      price2: 50,
    });
    expect(typeof result[0].difference).toBe("string");
    expect(result[0].difference).toContain("%");
  });

  it("difference reflects percentage between price1 and price2", () => {
    // price1=100, price2=50 → (50-100)/100*100 = -50.00%
    const result = compareHistories(h1, "A", h2, "B");
    expect(result[0].difference).toBe("-50.00%");
  });

  it("positive delayDays shifts h2 forward", () => {
    // delayDays=1: h1[0] vs h2[1], h1[1] vs h2[2], h1[2] skipped (j=3 out of bounds)
    const result = compareHistories(h1, "A", h2, "B", 1);
    expect(result).toHaveLength(2);
    expect(result[0].price1).toBe(100); // h1[0]
    expect(result[0].price2).toBe(100); // h2[1]
  });

  it("negative delayDays shifts h2 backward", () => {
    // delayDays=-1: h1[0] vs h2[-1] (skipped), h1[1] vs h2[0], h1[2] vs h2[1]
    const result = compareHistories(h1, "A", h2, "B", -1);
    expect(result).toHaveLength(2);
    expect(result[0].price1).toBe(200); // h1[1]
    expect(result[0].price2).toBe(50);  // h2[0]
  });

  it("returns empty array when histories have no overlap due to delay", () => {
    const result = compareHistories(h1, "A", h2, "B", 10);
    expect(result).toHaveLength(0);
  });
});
