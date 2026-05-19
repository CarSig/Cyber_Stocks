import type { Time } from 'lightweight-charts';
import type { AlpacaBar } from '@/types';
import type { ChartSeriesConfig } from '../hooks/usePriceChart';

export function buildIntradayChartConfig(
  bars: AlpacaBar[],
  toChartTime: (iso: string, ref?: Date) => Time,
): ChartSeriesConfig {
  return {
    toTime: (b) => {
      const ref = new Date(bars[0]?.t ?? b.t);
      return toChartTime(b.t, ref);
    },
    timeVisible: true,
    secondsVisible: false,
    tickMarkFormatter: (time: number, tickMarkType: number) => {
      const d = new Date(time * 1000);
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      if (tickMarkType <= 2) {
        const day = d.getUTCDate();
        const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        return `${day} ${mon} ${hh}:${mm}`;
      }
      return `${hh}:${mm}`;
    },
  };
}
