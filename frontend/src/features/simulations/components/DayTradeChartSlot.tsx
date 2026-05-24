import type { RefObject } from 'react';
import ChartTypeToggle, { type ChartType } from './ChartTypeToggle';

type Props = {
  chartType: ChartType;
  tradeMode: 'long' | 'short';
  value: string;
  containerRef: RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: 'SET_CHART_TYPE'; chartType: ChartType }) => void;
};

export default function DayTradeChartSlot({ chartType, tradeMode, value, containerRef, dispatch }: Props) {
  return (
    <>
      <ChartTypeToggle chartType={chartType} onChange={(t) => dispatch({ type: 'SET_CHART_TYPE', chartType: t })} />
      <div className="dtrade-chart-hint">
        {tradeMode === 'long'
          ? `Left click to buy $${value} · Right click to sell ${value}% · Hold 1s to configure`
          : `Left click to short $${value} · Right click to cover ${value}% · Hold 1s to configure`}
      </div>
      <div ref={containerRef} className="alpaca-chart-container" />
    </>
  );
}
