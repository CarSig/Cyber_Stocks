const PREFIX = 'sim:v1';

function key(kind: 'intraday' | 'long', mode: string, ticker: string | undefined): string {
  return `${PREFIX}:${kind}:${mode}:${ticker ?? 'none'}`;
}

export function load<T>(kind: 'intraday' | 'long', mode: string, ticker: string | undefined): Partial<T> | null {
  try {
    const raw = sessionStorage.getItem(key(kind, mode, ticker));
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function save<T>(
  kind: 'intraday' | 'long',
  mode: string,
  ticker: string | undefined,
  partial: Partial<T>,
): void {
  try {
    sessionStorage.setItem(key(kind, mode, ticker), JSON.stringify(partial));
  } catch {
    // sessionStorage full or disabled — ignore
  }
}

export function clear(kind: 'intraday' | 'long', mode: string, ticker: string | undefined): void {
  try {
    sessionStorage.removeItem(key(kind, mode, ticker));
  } catch {
    // ignore
  }
}
