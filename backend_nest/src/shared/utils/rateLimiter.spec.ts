import { RateLimiter } from "./rateLimiter";

describe("RateLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip1")).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    const limiter = new RateLimiter(3, 60_000);
    limiter.allow("ip1");
    limiter.allow("ip1");
    limiter.allow("ip1");
    expect(limiter.allow("ip1")).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const limiter = new RateLimiter(1, 60_000);
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip2")).toBe(true);
    expect(limiter.allow("ip1")).toBe(false);
    expect(limiter.allow("ip2")).toBe(false);
  });

  it("resets the counter after the window expires, restoring the full quota", () => {
    jest.useFakeTimers();
    const windowMs = 1000;
    const limiter = new RateLimiter(2, windowMs);
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip1")).toBe(false); // exhausted
    jest.advanceTimersByTime(windowMs + 1);
    // full quota restored — should allow 2 again, not just 1
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip1")).toBe(true);
    expect(limiter.allow("ip1")).toBe(false);
    jest.useRealTimers();
  });

  it("window does not reset before it expires", () => {
    jest.useFakeTimers();
    const windowMs = 1000;
    const limiter = new RateLimiter(1, windowMs);
    limiter.allow("ip1"); // exhaust
    jest.advanceTimersByTime(windowMs - 1); // one ms before reset
    expect(limiter.allow("ip1")).toBe(false);
    jest.useRealTimers();
  });

  it("blocks every request when limit=0", () => {
    const limiter = new RateLimiter(0, 60_000);
    expect(limiter.allow("ip1")).toBe(false);
    expect(limiter.allow("ip1")).toBe(false);
  });
});
