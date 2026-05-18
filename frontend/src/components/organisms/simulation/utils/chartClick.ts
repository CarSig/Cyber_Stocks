import type { IChartApi } from 'lightweight-charts';

const HOLD_DURATION = 1000; // ms before hold is detected

export type ChartClickHandlers = {
  chart: IChartApi;
  getHoveredIso: () => string | null;
  onQuickAction: (isoTime: string, button: 0 | 2) => void;
  onHoldStart: (isoTime: string, x: number, y: number, button: 0 | 2) => void;
};

/**
 * Attaches chart click handlers with hold-to-configure support.
 * Plain click (released before HOLD_DURATION) → onQuickAction fires immediately.
 * Hold for 1s → onHoldStart fires to show a configuration popover; no action until confirmed.
 * Returns a cleanup function to remove all listeners.
 */
export function attachChartClick(el: HTMLElement, opts: ChartClickHandlers): () => void {
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let startButton = -1;
  let didHold = false;

  function clearHold() {
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function onMouseUp(e: MouseEvent) {
    clearHold();
    window.removeEventListener('blur', onBlur);

    if (startButton === 0) opts.chart.applyOptions({ handleScroll: true, handleScale: true });

    if (!didHold && e.button === startButton) {
      const iso = opts.getHoveredIso();
      if (iso) opts.onQuickAction(iso, startButton as 0 | 2);
    }
  }

  function onBlur() {
    clearHold();
    if (startButton === 0) opts.chart.applyOptions({ handleScroll: true, handleScale: true });
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0 && e.button !== 2) return;
    startButton = e.button;
    didHold = false;

    if (e.button === 0) opts.chart.applyOptions({ handleScroll: false, handleScale: false });

    const downX = e.clientX;
    const downY = e.clientY;

    holdTimer = setTimeout(() => {
      didHold = true;
      const iso = opts.getHoveredIso();
      if (iso) opts.onHoldStart(iso, downX, downY, startButton as 0 | 2);
    }, HOLD_DURATION);

    window.addEventListener('mouseup', onMouseUp, { once: true });
    window.addEventListener('blur', onBlur, { once: true });
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  el.addEventListener('mousedown', onMouseDown);
  el.addEventListener('contextmenu', onContextMenu);

  return () => {
    clearHold();
    el.removeEventListener('mousedown', onMouseDown);
    el.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
    opts.chart.applyOptions({ handleScroll: true, handleScale: true });
  };
}
