const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
export const BASE = isLocalhost
  ? "http://localhost:3000"
  : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

export function authHeader() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeader(), "ngrok-skip-browser-warning": "1", ...opts.headers },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function qs(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function postJson(path, body) {
  return apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
