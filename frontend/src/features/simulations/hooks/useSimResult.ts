import { useMemo } from 'react';
import type { AlpacaBar } from '@/types';
import type { Action, SimResult } from '@/features/simulations/utils/sim';
import { runLongSimulation, runShortSimulation } from '@/features/simulations/utils/sim';

export function useSimResult(
  bars: AlpacaBar[],
  actions: Action[],
  startShares: string,
  tradeMode: 'long' | 'short',
  fmtTime: (iso: string) => string,
): SimResult | null {
  return useMemo<SimResult | null>(() => {
    if (!bars.length || !actions.length) return null;
    if (tradeMode === 'short') return runShortSimulation(bars, actions, fmtTime);
    return runLongSimulation(bars, actions, fmtTime, Math.max(0, Number(startShares) || 0));
  }, [bars, actions, startShares, tradeMode, fmtTime]);
}
