import type { RefObject, Dispatch } from 'react';
import ChartTypeToggle from './ChartTypeToggle';
import type { IntradaySimAction } from '../reducers/intradayReducer';

type Props = {
  chartType: string;
  tradeMode: 'long' | 'short';
  value: string;
  containerRef: RefObject<HTMLDivElement | null>;
  dayLinesRef: RefObject<HTMLDivElement | null>;
  prevDate: string;
  nextDate: string;
  extraDates: string[];
  dispatch: Dispatch<IntradaySimAction>;
};

export default function EventChartSlot({
  chartType,
  tradeMode,
  value,
  containerRef,
  dayLinesRef,
  prevDate,
  nextDate,
  extraDates,
  dispatch,
}: Props) {
  return (
    <>
      <ChartTypeToggle
        chartType={chartType}
        onChange={(t) => dispatch({ type: 'SET_CHART_TYPE', chartType: t })}
        extraButtons={
          <>
            <button
              className="sim-chart-btn"
              onClick={() => dispatch({ type: 'ADD_EXTRA_DATE', date: prevDate })}
              type="button"
            >
              + Day before ({prevDate})
            </button>
            <button
              className="sim-chart-btn"
              onClick={() => dispatch({ type: 'ADD_EXTRA_DATE', date: nextDate })}
              type="button"
            >
              + Day after ({nextDate})
            </button>
            {extraDates.length > 0 && (
              <button className="sim-chart-btn" onClick={() => dispatch({ type: 'RESET_EXTRA_DATES' })} type="button">
                Reset days
              </button>
            )}
          </>
        }
      />
      <div className="dtrade-chart-hint">
        {tradeMode === 'long'
          ? `Left click to buy $${value} · Right click to sell ${value}% · Hold 1s to configure`
          : `Left click to short $${value} · Right click to cover ${value}% · Hold 1s to configure`}
      </div>
      <div ref={containerRef} className="alpaca-chart-container">
        <div ref={dayLinesRef} className="alpaca-chart-daylines" />
      </div>
    </>
  );
}
