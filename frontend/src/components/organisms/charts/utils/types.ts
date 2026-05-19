import type { Quote } from '@/types';

export type QuoteAnalysis = {
  biggestSameDayDiff: Quote & { difference: string };
  biggestNextDayDiff: [Quote, Quote, string];
} | null;

export type MarkerPoint = { timestamp: string; side: string; value: number; shares: number };

export type HistoryPoint = { time: string; value: number };
