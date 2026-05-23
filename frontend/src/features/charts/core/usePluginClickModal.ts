import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Time } from 'lightweight-charts';
import type { ChartController, ChartPlugin, MarkerClickResult } from './types';

export type ModalState = MarkerClickResult & {
  /** Normalized click date — used by ChartModalHost as a title fallback when
   *  the plugin omits its own `title`. */
  date: string;
};

/**
 * Subscribes to chart clicks via the controller and dispatches to each
 * enabled plugin's `onMarkerClick`. First non-null result wins.
 *
 * Plugins/enabled changes are read through refs so the subscription is
 * registered ONCE per controller lifetime — no churn on every plugin tick.
 */
export function usePluginClickModal(
  controllerRef: RefObject<ChartController | null>,
  plugins: ChartPlugin[],
  enabled: Record<string, boolean>,
): [ModalState | null, () => void] {
  const [modal, setModal] = useState<ModalState | null>(null);

  // Keep latest plugins/enabled accessible from the stable click callback.
  const pluginsRef = useRef(plugins);
  const enabledRef = useRef(enabled);
  pluginsRef.current = plugins;
  enabledRef.current = enabled;

  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;

    const unsubscribe = ctrl.onClick((params) => {
      if (!params.time) return;
      const date = normalizeTimeToDate(params.time);

      for (const plugin of pluginsRef.current) {
        if (!plugin.onMarkerClick) continue;
        const isOn = enabledRef.current[plugin.id] ?? plugin.defaultEnabled ?? true;
        if (!isOn) continue;
        const result = plugin.onMarkerClick({ date, time: params.time, params });
        if (result) {
          setModal({ ...result, date });
          return;
        }
      }
    });

    return unsubscribe;
    // controllerRef.current changes when the primary series swaps (chart-type change).
    // We re-subscribe in that case via the .current read above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllerRef.current]);

  return [modal, () => setModal(null)];
}

/** YYYY-MM-DD from a lightweight-charts Time (string | number | BusinessDay). */
function normalizeTimeToDate(time: Time): string {
  if (typeof time === 'string') return time.slice(0, 10);
  if (typeof time === 'number') return new Date(time * 1000).toISOString().slice(0, 10);
  // BusinessDay shape: { year, month, day }
  const { year, month, day } = time;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
