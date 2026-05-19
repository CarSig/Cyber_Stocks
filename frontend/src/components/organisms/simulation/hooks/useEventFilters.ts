import { useState, useMemo } from 'react';
import type { IntradayEvent } from '@/api/alpaca';

export function useEventFilters(eventsData: IntradayEvent[] | undefined) {
  const [tickerFilter, setTickerFilter] = useState<string | null>(null);
  const [timingFilter, setTimingFilter] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () =>
      eventsData?.filter(
        (ev) =>
          (!tickerFilter || ev.ticker.split('/')[0].trim() === tickerFilter) &&
          (!timingFilter || ev.timing === timingFilter),
      ) ?? [],
    [eventsData, tickerFilter, timingFilter],
  );

  const isFiltered = !!(tickerFilter || timingFilter);

  return { tickerFilter, setTickerFilter, timingFilter, setTimingFilter, filteredEvents, isFiltered };
}
