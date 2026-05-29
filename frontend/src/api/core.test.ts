import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/react', () => ({ captureMessage: vi.fn() }));

import * as Sentry from '@sentry/react';
import { apiFetch } from './core';

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(Sentry.captureMessage).mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('returns parsed JSON for a 200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(makeResponse(200, { result: 42 }))),
    );
    const data = await apiFetch('/test');
    expect(data).toEqual({ result: 42 });
  });

  it('throws "Unauthorized" for a 401 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(makeResponse(401, {}))),
    );
    await expect(apiFetch('/test')).rejects.toThrow('Unauthorized');
  });

  it('calls Sentry.captureMessage for a 500 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(makeResponse(500, { error: 'boom' }))),
    );
    await expect(apiFetch('/test')).rejects.toThrow();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('500'),
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('does NOT call Sentry.captureMessage for a 4xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(makeResponse(404, { error: 'not found' }))),
    );
    await expect(apiFetch('/test')).rejects.toThrow();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('throws a timeout error when fetch takes too long', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise<Response>((_, reject) => {
          const sig = init.signal;
          if (sig?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          sig?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }),
    );

    await expect(apiFetch('/slow', { timeoutMs: 10 })).rejects.toThrow(/timed out after 10ms/);
  }, 3000);

  it('propagates a caller abort signal cancellation', async () => {
    const ac = new AbortController();
    // A fetch that rejects when signal fires
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise<Response>((_, reject) => {
          const sig = init.signal;
          if (sig?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }
          sig?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }),
    );

    const p = apiFetch('/cancellable', { signal: ac.signal, timeoutMs: 60_000 });
    ac.abort();
    await expect(p).rejects.toThrow();
  }, 3000);
});
