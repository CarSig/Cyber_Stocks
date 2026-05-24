import type { IChartApi } from 'lightweight-charts';
import type { Dispatch } from 'react';
import type { BaseSimAction } from '../reducers/baseReducer';
import { attachChartClick } from './chartClick';
import type { ChartClickHandlers } from './chartClick';

type Side = 'buy' | 'sell' | 'short' | 'cover';

export type ChartClickHandlerOptions<A extends { id: number; timestamp?: string; date?: string }> = {
  chart: IChartApi;
  getHoveredIso: () => string | null;
  actionsRef: React.MutableRefObject<A[]>;
  valueRef: React.MutableRefObject<string>;
  tradeModeRef: React.MutableRefObject<'long' | 'short'>;
  nextIdRef: React.MutableRefObject<number>;
  dispatch: Dispatch<BaseSimAction<A>>;
  date: string;
  fmtLabel: (iso: string) => string;
  createAction: (id: number, iso: string, label: string, side: Side, value: number) => A;
  onPopoverOpen: (iso: string, x: number, y: number, side: Side, value: string) => void;
  onEditPopoverOpen: (action: A, x: number, y: number) => void;
};

/**
 * Creates the onQuickAction and onHoldStart handlers for attachChartClick,
 * factoring out the duplicated side-determination and value-clamping logic.
 */
export function makeChartClickHandlers<A extends { id: number; timestamp?: string; date?: string }>(
  opts: ChartClickHandlerOptions<A>,
): ChartClickHandlers {
  const {
    chart,
    getHoveredIso,
    actionsRef,
    valueRef,
    tradeModeRef,
    nextIdRef,
    dispatch,
    date,
    fmtLabel,
    createAction,
    onPopoverOpen,
    onEditPopoverOpen,
  } = opts;

  return {
    chart,
    getHoveredIso,
    onQuickAction: (iso, button) => {
      if (actionsRef.current.find((a) => ('timestamp' in a ? a.timestamp === iso : a.date === iso))) return;
      if (button === 0) {
        const side: Side = tradeModeRef.current === 'short' ? 'short' : 'buy';
        const val = Math.max(0.01, Number(valueRef.current) || 100);
        dispatch({
          type: 'ADD_ACTION',
          action: createAction(nextIdRef.current++, iso, fmtLabel(iso), side, val),
          date,
        });
      } else {
        const side: Side = tradeModeRef.current === 'short' ? 'cover' : 'sell';
        const val = Math.min(100, Math.max(0.01, Number(valueRef.current) || 50));
        dispatch({
          type: 'ADD_ACTION',
          action: createAction(nextIdRef.current++, iso, fmtLabel(iso), side, val),
          date,
        });
      }
    },
    onHoldStart: (iso, x, y, button) => {
      const existing = actionsRef.current.find((a) =>
        'timestamp' in a ? a.timestamp === iso : a.date === iso,
      );
      if (existing) {
        onEditPopoverOpen(existing, x, y);
        return;
      }
      const side: Side =
        button === 0
          ? tradeModeRef.current === 'short'
            ? 'short'
            : 'buy'
          : tradeModeRef.current === 'short'
            ? 'cover'
            : 'sell';
      const val =
        button === 0
          ? String(Math.max(0.01, Number(valueRef.current) || 100))
          : String(Math.min(100, Math.max(0.01, Number(valueRef.current) || 50)));
      onPopoverOpen(iso, x, y, side, val);
    },
  };
}

/**
 * Convenience: attaches chart click handlers using makeChartClickHandlers + attachChartClick.
 * Returns a cleanup function.
 */
export function attachSimChartClick<A extends { id: number; timestamp?: string; date?: string }>(
  el: HTMLElement,
  opts: ChartClickHandlerOptions<A>,
): () => void {
  const handlers = makeChartClickHandlers(opts);
  return attachChartClick(el, handlers);
}
