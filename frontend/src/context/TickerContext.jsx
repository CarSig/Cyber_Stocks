import { useTickerStore } from './tickerStore.js';

// Drop-in replacement for the old context hook — same API, no changes needed in consumers
export function useTickerContext() {
  return useTickerStore();
}

// Zustand needs no provider — kept as a passthrough for compatibility
export function TickerProvider({ children }) {
  return children;
}
