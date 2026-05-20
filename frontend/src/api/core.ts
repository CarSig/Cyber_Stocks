const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const BASE = isLocalhost
  ? 'http://localhost:3000/api/v1'
  : `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1`;

export function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeader(), ...opts.headers },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string | { message?: string; code?: string } };
    const err = body.error;
    const msg = typeof err === 'string' ? err : (err?.message ?? `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function postJson<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
