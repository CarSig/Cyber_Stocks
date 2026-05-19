import { useMemo } from 'react';
import type { IntradayEvent } from '@/features/charts/api';
import FilterSelect from '@/components/common/FilterSelect';

type EventFiltersProps = {
  eventsData: IntradayEvent[];
  tickerFilter: string | null;
  onTickerFilterChange: (v: string | null) => void;
  timingFilter: string | null;
  onTimingFilterChange: (v: string | null) => void;
  filteredEvents: IntradayEvent[];
  selectedEvent: IntradayEvent | null;
  onEventSelect: (eventLabel: string | null) => void;
};

export default function EventFilters({
  eventsData,
  tickerFilter,
  onTickerFilterChange,
  timingFilter,
  onTimingFilterChange,
  filteredEvents,
  selectedEvent,
  onEventSelect,
}: EventFiltersProps) {
  const tickers = useMemo(
    () => [...new Set(eventsData.map((ev) => ev.ticker.split('/')[0].trim()))].sort(),
    [eventsData],
  );
  const timings = useMemo(() => [...new Set(eventsData.map((ev) => ev.timing))].sort(), [eventsData]);

  return (
    <>
      <FilterSelect
        value={tickerFilter}
        onChange={(v) => onTickerFilterChange(v || null)}
        placeholder="Ticker…"
        showAll
        allLabel="All"
        className="alpaca-input w-28"
        options={tickers}
      />
      <FilterSelect
        value={timingFilter}
        onChange={(v) => onTimingFilterChange(v || null)}
        placeholder="Timing…"
        showAll
        allLabel="All"
        className="alpaca-input w-32"
        options={timings}
      />
      <FilterSelect
        value={selectedEvent?.event ?? null}
        onChange={onEventSelect}
        placeholder="Events…"
        showAll={false}
        className="alpaca-input w-55"
        options={filteredEvents.map((ev) => ({
          value: ev.event,
          label: `#${ev.rank} ${ev.ticker} — ${ev.event.slice(0, 40)}${ev.event.length > 40 ? '…' : ''}`,
        }))}
      />
    </>
  );
}
