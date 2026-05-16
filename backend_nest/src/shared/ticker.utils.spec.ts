import { resolveTicker, tickerToName } from "./ticker.utils";
import { AppError } from "./errors";

describe("tickerToName", () => {
  it("is a non-empty map from ticker symbol to company name", () => {
    expect(Object.keys(tickerToName).length).toBeGreaterThan(0);
    const [ticker, name] = Object.entries(tickerToName)[0];
    expect(typeof ticker).toBe("string");
    expect(typeof name).toBe("string");
  });

  it("keys are uppercase ticker symbols", () => {
    for (const key of Object.keys(tickerToName)) {
      expect(key).toBe(key.toUpperCase());
    }
  });
});

describe("resolveTicker", () => {
  it("returns uppercased ticker and company name for a known ticker", () => {
    const anyTicker = Object.keys(tickerToName)[0];
    const result = resolveTicker(anyTicker);
    expect(result.ticker).toBe(anyTicker.toUpperCase());
    expect(result.name).toBe(tickerToName[anyTicker]);
  });

  it("is case-insensitive", () => {
    const anyTicker = Object.keys(tickerToName)[0];
    const lower = anyTicker.toLowerCase();
    const result = resolveTicker(lower);
    expect(result.ticker).toBe(anyTicker.toUpperCase());
  });

  it("throws 404 AppError for an unknown ticker", () => {
    expect(() => resolveTicker("ZZZNOTTICKER")).toThrow(AppError);
    try {
      resolveTicker("ZZZNOTTICKER");
    } catch (e) {
      expect((e as AppError).status).toBe(404);
      expect((e as AppError).message).toContain("ZZZNOTTICKER");
    }
  });
});
