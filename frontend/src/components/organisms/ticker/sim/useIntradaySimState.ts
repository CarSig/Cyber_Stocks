import { useState } from 'react';
import type { IntradayEvent } from '@/api/alpaca';
import { DateUtils } from '@/utils/date';
import type { Side, Action } from '@/utils/sim';

export type SimAllRow = {
  rank: number;
  ticker: string; // primary ticker from event
  event: string;
  trade_idea: string;
  action: 'buy' | 'short';
  chartTime: string;
  preMarket: boolean;
  entryTime: string;
  profitPct: number | null;
  error?: string;
};

const defaultDate = () => DateUtils.lastWeekday(DateUtils.todayStr());

export function useIntradaySimState() {
  const [date, setDate] = useState(defaultDate);
  const [timeframe, setTimeframe] = useState('5Min');
  const [query, setQuery] = useState(() => ({
    ticker: 'CRWD',
    date: defaultDate(),
    timeframe: '5Min',
  }));
  const [actions, setActions] = useState<Action[]>([]);
  const [nextSide, setNextSide] = useState<Side>('buy');
  const [value, setValue] = useState('100');
  const [startShares, setStartShares] = useState('0');
  const [manualTime, setManualTime] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [textValue, setTextValue] = useState(defaultDate);
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('area');
  const [tradeMode, setTradeMode] = useState<'long' | 'short'>('long');
  const [selectedEvent, setSelectedEvent] = useState<IntradayEvent | null>(null);
  const [showPeers, setShowPeers] = useState(false);
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [simAllResults, setSimAllResults] = useState<SimAllRow[] | null>(null);
  const [simAllRunning, setSimAllRunning] = useState(false);
  const [aiDelay, setAiDelay] = useState(1);

  return {
    date, setDate,
    timeframe, setTimeframe,
    query, setQuery,
    actions, setActions,
    nextSide, setNextSide,
    value, setValue,
    startShares, setStartShares,
    manualTime, setManualTime,
    textMode, setTextMode,
    textValue, setTextValue,
    chartType, setChartType,
    tradeMode, setTradeMode,
    selectedEvent, setSelectedEvent,
    showPeers, setShowPeers,
    extraDates, setExtraDates,
    simAllResults, setSimAllResults,
    simAllRunning, setSimAllRunning,
    aiDelay, setAiDelay,
  };
}
