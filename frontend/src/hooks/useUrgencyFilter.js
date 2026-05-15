import { useState } from 'react';
import { classifyUrgency, URGENCY_CONFIG } from '@/utils/urgencyUtils.js';

export default function useUrgencyFilter(articles) {
  const [activeUrgency, setActiveUrgency] = useState('all');

  const enriched = (articles ?? []).map((a) => {
    try {
      const urgency = a.urgency || classifyUrgency(a.timestamp, a.globalSignals ?? [], a.companySignals ?? []);
      return { ...a, _urgency: urgency };
    } catch {
      return { ...a, _urgency: a.urgency || 'future_short' };
    }
  });

  const counts = {};
  enriched.forEach((a) => {
    counts[a._urgency] = (counts[a._urgency] || 0) + 1;
  });

  const filtered = enriched
    .filter((a) => activeUrgency === 'all' || a._urgency === activeUrgency)
    .sort((a, b) => URGENCY_CONFIG[a._urgency].order - URGENCY_CONFIG[b._urgency].order);

  return { enriched, counts, activeUrgency, setActiveUrgency, filtered };
}
