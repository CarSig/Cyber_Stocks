import { useState } from 'react';
import { useCyberNewsTickers, useCyberNewsTopics, useCyberNewsCorrelations } from './useCyberNews';
import indexBy from '@/utils/indexBy';
import type { CyberNewsTicker, CyberNewsTopic, CorrelationResult } from '@/types';

type CyberNewsCorrelationEntry = { ticker: string; correlation?: CorrelationResult };

export function useCyberNewsPage() {
  const [selected, setSelected] = useState<CyberNewsTicker | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [lagDays, setLagDays] = useState(1);
  const [viewMode, setViewMode] = useState('list');

  const { data: tickers, isPending } = useCyberNewsTickers(selectedTopic ?? undefined);
  const { data: correlations } = useCyberNewsCorrelations(lagDays, selectedTopic ?? undefined);
  const { data: allTopics, isPending: topicsLoading } = useCyberNewsTopics();

  const correlationByTicker = indexBy((correlations as CyberNewsCorrelationEntry[]) ?? [], 'ticker');

  return {
    selected,
    setSelected,
    selectedTopic,
    setSelectedTopic,
    lagDays,
    setLagDays,
    viewMode,
    setViewMode,
    tickers: tickers as CyberNewsTicker[] | undefined,
    isPending,
    allTopics: allTopics as CyberNewsTopic[] | undefined,
    topicsLoading,
    correlationByTicker,
  };
}
