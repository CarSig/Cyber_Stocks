export type {
  CorrelationResult,
  CorrelationMatrixData,
  LagImpactResult,
  CorrelationWithImpact,
  RollingCorrelation,
  LagBucket,
} from '@algo/shared';

import type { CorrelationResult, LagImpactResult } from '@algo/shared';
import type { SentimentLabel } from '@/types';

export type SingleLagImpact = {
  avgChangePct?: number | null;
  n?: number;
  windowDays?: number;
};

export type CorrelationBoxProps = {
  correlation?: CorrelationResult | null;
  lagImpact?: LagImpactResult | SingleLagImpact | null;
  lagImpactLabel?: string;
  lagDays?: number;
  onLagDaysChange?: (days: number) => void;
  isPending?: boolean;
  isFetching?: boolean;
  error?: Error | null;
};

export type CorrelationWrapper = {
  result?: CorrelationResult | { error: string };
};

export type EntitySummary = {
  avgSentiment?: number;
};

export type CorrelationMetrics = {
  corrResult: CorrelationResult | { error: string } | undefined;
  hasCorrelation: boolean;
  strength: SentimentLabel | null;
  sentimentInfo: SentimentLabel | null;
};
