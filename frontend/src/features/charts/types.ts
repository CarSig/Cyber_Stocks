import type { Quote, AlpacaBar } from '@/types';

export type QuoteAnalysis = {
  biggestSameDayDiff: Quote & { difference: string };
  biggestNextDayDiff: [Quote, Quote, string];
} | null;

export type MarkerPoint = { timestamp: string; side: string; value: number; shares: number };

export type HistoryPoint = { time: string; value: number };

export type AlpacaBarsResponse = { bars: AlpacaBar[]; symbol: string };

export type IntradayEvent = {
  rank: number;
  event: string;
  severity: number;
  ticker: string;
  peers: string[];
  trade_idea: string;
  source: string;
  source_date: string;
  source_time: string;
  source_link: string;
  first_time: string;
  first_date: string;
  first_link: string;
  notes: string;
  chart_date: string;
  chart_time: string;
  after_hours: boolean;
  timing: 'pre-market' | 'post-market' | 'during';
};

export type ChartModalProps = { date: string; onClose: () => void; children?: import('react').ReactNode };
