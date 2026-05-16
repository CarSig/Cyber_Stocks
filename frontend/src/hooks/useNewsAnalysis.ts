import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BASE } from '@/api/core';
import { getAnalysis, analyze as analyzeNews, getCorrelation } from '@/api/news';
import { useCorrelationQuery } from './useCorrelationQuery';

type ProgressCount = { current: number; total: number };

export function useNewsAnalysis(ticker: string) {
  const queryClient = useQueryClient();
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [lagDays, setLagDays] = useState(1);
  const [polling, setPolling] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [progressCount, setProgressCount] = useState<ProgressCount | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const analysis = useQuery({
    queryKey: ['news-analysis', ticker],
    queryFn: () => getAnalysis(ticker),
    enabled: !!ticker,
  });

  const analyzedCount = progressCount?.current ?? (analysis.data ? Object.keys(analysis.data).length : 0);
  const totalCount = progressCount?.total ?? null;

  function connectProgress() {
    if (esRef.current) esRef.current.close();
    const token = localStorage.getItem('auth_token') ?? '';
    const es = new EventSource(`${BASE}/news/analyze/${ticker}/progress?token=${encodeURIComponent(token)}`);
    esRef.current = es;
    setPolling(true);

    es.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as { type?: string; title?: string; current?: number; total?: number };
      if (data.type === 'progress') {
        setCurrentTitle(data.title ?? null);
        setProgressCount({ current: data.current ?? 0, total: data.total ?? 0 });
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setPolling(false);
      setCurrentTitle(null);
      queryClient.invalidateQueries({ queryKey: ['news-analysis', ticker] });
      queryClient.invalidateQueries({ queryKey: ['news-correlation', ticker] });
    };
  }

  useEffect(() => {
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [ticker]);

  useEffect(() => {
    if (progressCount && progressCount.current >= progressCount.total) {
      esRef.current?.close();
      esRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: cleanup SSE stream on completion
      setPolling(false);
      setCurrentTitle(null);
      setProgressCount(null);
      queryClient.invalidateQueries({ queryKey: ['news-analysis', ticker] });
      queryClient.invalidateQueries({ queryKey: ['news-correlation', ticker] });
    }
  }, [progressCount, ticker, queryClient]);

  const correlation = useCorrelationQuery(
    ['news-correlation', ticker, lagDays],
    () => getCorrelation(ticker, lagDays),
    showCorrelation && !!ticker,
  );

  const analyze = useMutation({
    mutationFn: () => analyzeNews(ticker),
    onSuccess: (data) => {
      if (data.queued > 0) {
        setProgressCount({ current: 0, total: data.queued });
        connectProgress();
      }
    },
  });

  return {
    analysis,
    correlation,
    analyze,
    showCorrelation,
    setShowCorrelation,
    polling,
    lagDays,
    setLagDays,
    currentTitle,
    analyzedCount,
    totalCount,
  };
}
