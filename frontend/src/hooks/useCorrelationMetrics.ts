import { correlationStrength, sentimentLabel } from '@/utils/sentimentUtils';
import type { CorrelationResult, SentimentLabel } from '@/types';

type CorrelationWrapper = {
  result?: CorrelationResult | { error: string };
};

type EntitySummary = {
  avgSentiment?: number;
};

type CorrelationMetrics = {
  corrResult: CorrelationResult | { error: string } | undefined;
  hasCorrelation: boolean;
  strength: SentimentLabel | null;
  sentimentInfo: SentimentLabel | null;
};

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
