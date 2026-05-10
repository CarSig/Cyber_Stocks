// Sliding-window in-memory rate limiter keyed by IP.
// Intended for auth endpoints only — not a substitute for a reverse-proxy limiter.

type Window = {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  readonly #max: number;
  readonly #windowMs: number;
  readonly #store = new Map<string, Window>();

  constructor(max: number, windowMs: number) {
    this.#max = max;
    this.#windowMs = windowMs;
  }

  /** Returns true if the request should be allowed, false if it exceeds the limit. */
  allow(key: string): boolean {
    const now = Date.now();
    let w = this.#store.get(key);
    if (!w || now >= w.resetAt) {
      w = { count: 0, resetAt: now + this.#windowMs };
      this.#store.set(key, w);
    }
    w.count++;
    return w.count <= this.#max;
  }
}

// 10 attempts per 15 minutes per IP for auth endpoints
export const authLimiter = new RateLimiter(10, 15 * 60 * 1000);
