import type { ReactNode } from 'react';
import { useTickerStore } from '@/stores/tickerStore';

// eslint-disable-next-line react-refresh/only-export-components -- hook and provider intentionally co-located
export function useTickerContext() {
  return useTickerStore();
}

export function TickerProvider({ children }: { children: ReactNode }) {
  return children;
}
