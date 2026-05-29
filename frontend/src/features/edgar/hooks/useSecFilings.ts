import { useCallback, useMemo, useState } from 'react';
import type { ChartPlugin } from '@/features/charts';
import { useSecFiles } from './useSecData';
import { secFilingsOverlay } from '../plugins/secFilingsOverlay';
import { getFormStyle } from '../utils';

export type PresentForm = { label: string; color: string };

/**
 * Shared filings-overlay state for the EDGAR per-company view: which form types
 * are enabled, the swatch list, and a factory that builds an overlay plugin
 * (per chart, each needs a distinct id). Markers default to off.
 */
export function useSecFilings(ticker: string | null) {
  const { data: filings = [] } = useSecFiles(ticker);
  const [enabledForms, setEnabledForms] = useState<Set<string>>(new Set());

  // Distinct form types present in the loaded filings, resolved to marker style.
  const presentForms = useMemo<PresentForm[]>(() => {
    const m = new Map<string, string>(); // style label → color
    for (const f of filings) {
      if (!f.meta?.form) continue;
      const { label, color } = getFormStyle(f.meta.form);
      m.set(label, color);
    }
    return [...m].map(([label, color]) => ({ label, color })).sort((a, b) => a.label.localeCompare(b.label));
  }, [filings]);

  const shownFilings = useMemo(
    () => filings.filter((f) => enabledForms.has(getFormStyle(f.meta?.form).label)),
    [filings, enabledForms],
  );

  const allOn = presentForms.length > 0 && enabledForms.size === presentForms.length;

  const toggleForm = useCallback((label: string) => {
    setEnabledForms((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setEnabledForms((prev) => (prev.size === presentForms.length ? new Set() : new Set(presentForms.map((f) => f.label))));
  }, [presentForms]);

  // One plugin instance per chart id. Each ChartAuto must get its own so the
  // overlay engine keys markers correctly per chart.
  const makeOverlay = useCallback(
    (id: string): ChartPlugin[] =>
      shownFilings.length ? [secFilingsOverlay({ id, filings: shownFilings, defaultEnabled: true })] : [],
    [shownFilings],
  );

  return { presentForms, enabledForms, allOn, anyOn: enabledForms.size > 0, toggleForm, toggleAll, makeOverlay };
}
