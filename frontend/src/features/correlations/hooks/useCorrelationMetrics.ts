import { correlationStrength, sentimentLabel } from '@/utils/sentimentUtils';
import type { CorrelationResult } from '@/types';
import type { CorrelationWrapper, EntitySummary, CorrelationMetrics } from '../types';

export default function useCorrelationMetrics(
  correlation?: CorrelationWrapper,
  summary?: EntitySummary,
): CorrelationMetrics {
  const corrResult = correlation?.result;
  const hasCorrelation = !!corrResult && !('error' in corrResult);
  const strength = hasCorrelation ? correlationStrength((corrResult as CorrelationResult).r) : null;
  const sentimentInfo = summary?.avgSentiment != null ? sentimentLabel(summary.avgSentiment) : null;
  return { corrResult, hasCorrelation, strength, sentimentInfo };
}
