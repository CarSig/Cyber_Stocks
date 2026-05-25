import { useState, useMemo } from 'react';
import Page from '@/components/common/layout/Page';
import SecDownloadForm from '@/features/edgar/components/SecDownloadForm';
import SecPriceChart from '@/features/edgar/components/SecPriceChart';
import SecTimeline from '@/features/edgar/components/SecTimeline';
import SecFilingImpactTable from '@/features/edgar/components/SecFilingImpactTable';
import { useSecCoverage } from '@/features/edgar/hooks/useSecData';
import { useStock } from '@/features/tickers/hooks/useStock';
import { ChartAuto, hvOverlay, atrOverlay, type ChartPlugin } from '@/features/charts';
import './EdgarArchive.css';

function defaultDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function SecArchiveContent({ ticker, onTickerChange }: { ticker: string; onTickerChange: (t: string) => void }) {
  const { data: coverage } = useSecCoverage(ticker);
  const { allQuotes } = useStock(ticker, {});

  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string } | null>(null);
  const [showVolatility, setShowVolatility] = useState(false);

  // Date inputs for the download form — driven by chart visible range
  const [dateFrom, setDateFrom] = useState(defaultDate(30));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  function toDateStr(v: string): string {
    // lightweight-charts may emit unix timestamps as strings, e.g. "1704067200"
    if (/^\d{9,}$/.test(v)) return new Date(Number(v) * 1000).toISOString().slice(0, 10);
    return v.slice(0, 10);
  }

  // When the chart is panned/zoomed, sync the download date inputs
  function handleRangeChange(range: { from: string; to: string }) {
    const from = toDateStr(range.from);
    const to = toDateStr(range.to);
    setVisibleRange({ from, to });
    setDateFrom(from);
    setDateTo(to);
  }

  const volatilityPlugins: ChartPlugin[] = useMemo(
    () => [hvOverlay({ quotes: allQuotes ?? [] }), atrOverlay({ quotes: allQuotes ?? [] })],
    [allQuotes],
  );

  const volumeData = useMemo(
    () =>
      (allQuotes ?? [])
        .filter((q) => q.volume != null)
        .map((q) => ({
          time: q.date.slice(0, 10) as `${number}-${number}-${number}`,
          value: Number(q.volume),
          color: '#3b82f6',
        })),
    [allQuotes],
  );

  const defaultRange = coverage?.ranges.length
    ? { from: coverage.ranges[0].from, to: coverage.ranges[coverage.ranges.length - 1].to }
    : null;

  return (
    <>
      <SecDownloadForm
        selectedTicker={ticker}
        onTickerChange={onTickerChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <SecPriceChart
        ticker={ticker}
        visibleRange={visibleRange}
        onRangeChange={handleRangeChange}
        defaultRange={defaultRange}
        showVolatility={showVolatility}
        onVolatilityToggle={() => setShowVolatility((v) => !v)}
      />
      <ChartAuto
        data={volumeData}
        defaultType="Histogram"
        availableTypes={['Histogram']}
        hideTypeControls
        hidePeriodControls
        visibleRange={visibleRange}
        onRangeChange={handleRangeChange}
        resize={{ enabled: true }}
        toolbarExtras={<span className="chart-series-label chart-series-label-ml">Yahoo Volume</span>}
      />

      {showVolatility && (
        <ChartAuto
          data={[]}
          defaultType="Line"
          availableTypes={['Line']}
          hideTypeControls
          hidePeriodControls
          visibleRange={visibleRange}
          onRangeChange={handleRangeChange}
          plugins={volatilityPlugins}
        />
      )}
      <SecTimeline ticker={ticker} visibleRange={visibleRange} onRangeChange={handleRangeChange} />
      <SecFilingImpactTable ticker={ticker} />
    </>
  );
}

export default function SecArchive() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  return (
    <Page title="SEC EDGAR Archive">
      {selectedTicker ? (
        <SecArchiveContent key={selectedTicker} ticker={selectedTicker} onTickerChange={setSelectedTicker} />
      ) : (
        <SecDownloadForm
          selectedTicker={null}
          onTickerChange={setSelectedTicker}
          dateFrom={defaultDate(30)}
          dateTo={new Date().toISOString().slice(0, 10)}
          onDateFromChange={() => {}}
          onDateToChange={() => {}}
        />
      )}
    </Page>
  );
}
