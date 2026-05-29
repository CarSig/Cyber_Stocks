import * as Sentry from '@sentry/react';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const BASE = isLocalhost
  ? 'http://localhost:3000/api/v1'
  : `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1`;

export function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isLocalhost ? { 'ngrok-skip-browser-warning': 'true', 'User-Agent': 'Mozilla/5.0' } : {}),
  };
}

export type ApiOpts = RequestInit & { timeoutMs?: number };

export async function apiFetch<T = unknown>(path: string, opts: ApiOpts = {}): Promise<T> {
  const { timeoutMs = 30_000, signal: callerSignal, ...rest } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);

  const onCallerAbort = () => controller.abort((callerSignal as AbortSignal).reason);
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: { ...authHeader(), ...rest.headers },
      signal: controller.signal,
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) {
      if (res.status >= 500) {
        Sentry.captureMessage(`API ${res.status} ${path}`, {
          level: 'error',
          tags: { api_path: path, api_status: String(res.status) },
        });
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string | { message?: string; code?: string } };
      const err = body.error;
      const msg = typeof err === 'string' ? err : (err?.message ?? `Request failed: ${res.status}`);
      throw new Error(msg);
    }
    return res.json() as Promise<T>;
  } catch (e) {
    // When AbortError fires, check if it came from our internal timeout
    if (e instanceof DOMException && e.name === 'AbortError' && controller.signal.reason?.name === 'TimeoutError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function postJson<T = unknown>(path: string, body: unknown, opts?: ApiOpts): Promise<T> {
  return apiFetch<T>(path, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    body: JSON.stringify(body),
  });
}
