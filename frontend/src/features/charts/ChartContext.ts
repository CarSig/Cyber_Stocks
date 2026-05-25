import { createContext, useContext } from 'react';
import type { ChartPlugin, ChartType } from './types';

export type ChartContextValue = {
  type: ChartType;
  setType: (t: ChartType) => void;
  availableTypes: ChartType[];

  selectedPeriod: number | null | undefined;
  onPeriodChange?: (days: number) => void;
  availablePeriods: number[];

  plugins: ChartPlugin[];
  enabled: Record<string, boolean>;
  toggle: (id: string, next?: boolean) => void;
};

export const ChartContext = createContext<ChartContextValue | null>(null);

export function useChartContext(component: string): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Chart>`);
  return ctx;
}
