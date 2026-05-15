import { useState } from 'react';
import { classifyUrgency, URGENCY_CONFIG } from '@/utils/urgencyUtils';
import type { UrgencyKey, NewsArticle } from '@/types';

type EnrichedArticle = NewsArticle & { _urgency: UrgencyKey };

export default function useUrgencyFilter(articles?: NewsArticle[]) {
  const [activeUrgency, setActiveUrgency] = useState<UrgencyKey | 'all'>('all');

  const enriched: EnrichedArticle[] = (articles ?? []).map((a) => {
    try {
      const urgency =
        a.urgency ??
        classifyUrgency(
          a.timestamp ?? a.publishedAt ?? 0,
          a.globalSignals ?? [],
          a.companySignals ?? [],
        );
      return { ...a, _urgency: urgency };
    } catch {
      return { ...a, _urgency: a.urgency ?? 'future_short' };
    }
  });

  const counts: Record<string, number> = {};
  enriched.forEach((a) => {
    counts[a._urgency] = (counts[a._urgency] || 0) + 1;
  });

  const filtered = enriched
    .filter((a) => activeUrgency === 'all' || a._urgency === activeUrgency)
    .sort((a, b) => URGENCY_CONFIG[a._urgency].order - URGENCY_CONFIG[b._urgency].order);

  return { enriched, counts, activeUrgency, setActiveUrgency, filtered };
}
