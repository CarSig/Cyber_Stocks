import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type SyncProgress = {
  current: number;
  total: number;
  form: string;
  accession: string;
};

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/v1'
    : `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1`;

export function useSecSyncProgress(ticker: string | null, active: boolean) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!ticker || !active) {
      setProgress(null);
      return;
    }

    const token = localStorage.getItem('auth_token') ?? '';
    const url = `${API_BASE}/edgar/sync/progress/${ticker}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    function onComplete() {
      qc.invalidateQueries({ queryKey: ['sec-files', ticker] });
      qc.invalidateQueries({ queryKey: ['sec-coverage', ticker] });
      qc.invalidateQueries({ queryKey: ['sec-sync-status', ticker] });
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ping') return;
        if (data.type === 'progress') {
          setProgress({ current: data.current, total: data.total, form: data.form, accession: data.accession });
          // Server completes the subject when all filings are done; refresh listings then.
          if (data.total > 0 && data.current >= data.total) onComplete();
        }
      } catch {
        /* ignore */
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Stream closed — either done or dropped. Refresh status + listings to reconcile.
      onComplete();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [ticker, active, qc]);

  function reset() {
    setProgress(null);
  }

  return { progress, reset };
}
