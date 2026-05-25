import { useState } from 'react';
import { useBackendEntities, useAllSentimentCorrelations, useGlobalSignals } from './useIntelligence';
import indexBy from '@/utils/indexBy';
import type { IntelligenceEntity, IntelligenceSignal, CorrelationResult } from '@/types';

export function useIntelligencePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [lagDays, setLagDays] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [signalsExpanded, setSignalsExpanded] = useState(true);

  const { data: entities, isPending } = useBackendEntities();
  const { data: correlations } = useAllSentimentCorrelations(lagDays, selectedSignal ?? undefined);
  const { data: allSignals, isPending: signalsLoading } = useGlobalSignals();

  const uniqueEntities: IntelligenceEntity[] = entities
    ? [...new Map((entities as IntelligenceEntity[]).map((e) => [e.entityId, e])).values()]
    : [];

  const correlationByEntityId = indexBy(
    (correlations as Array<{ entityId: string; correlation?: CorrelationResult }>) ?? [],
    'entityId',
  );
  const filteredSignals = (allSignals as IntelligenceSignal[] | undefined)?.filter((s) => s.count >= 5) ?? [];

  return {
    selected,
    setSelected,
    selectedSignal,
    setSelectedSignal,
    lagDays,
    setLagDays,
    viewMode,
    setViewMode,
    signalsExpanded,
    setSignalsExpanded,
    uniqueEntities,
    isPending,
    correlationByEntityId,
    filteredSignals,
    signalsLoading,
  };
}
