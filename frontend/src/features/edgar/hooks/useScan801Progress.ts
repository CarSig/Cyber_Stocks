import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type Scan801Progress = {
  current: number;
  total: number;
  matched: number;
  ticker?: string;
  accession?: string;
};

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/v1'
    : `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1`;

export function useScan801Progress(active: boolean) {
  const [progress, setProgress] = useState<Scan801Progress | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!active) {
      setProgress(null);
      return;
    }

    const token = localStorage.getItem('auth_token') ?? '';
    const url = `${API_BASE}/edgar/scan/801/progress?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    function onComplete() {
      qc.invalidateQueries({ queryKey: ['sec-scan801-status'] });
      qc.invalidateQueries({ queryKey: ['sec-scan801-results'] });
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ping') return;
        if (data.type === 'progress') {
          setProgress({
            current: data.current,
            total: data.total,
            matched: data.matched,
            ticker: data.ticker,
            accession: data.accession,
          });
        } else if (data.type === 'done') {
          onComplete();
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      onComplete();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [active, qc]);

  function reset() {
    setProgress(null);
  }

  return { progress, reset };
}
