import { useState, useMemo } from 'react';
import SecPriceChart from '@/features/edgar/components/SecPriceChart';
import SecChartPanel from '@/features/edgar/components/SecChartPanel';
import SecVolatilityChart from '@/features/edgar/components/SecVolatilityChart';
import FilingsControls from '@/features/edgar/components/FilingsControls';
import SecTimeline from '@/features/edgar/components/SecTimeline';
import SecFilingImpactTable from '@/features/edgar/components/SecFilingImpactTable';
import { useSecCoverage, useSecSync, useSecSyncStatus } from '@/features/edgar/hooks/useSecData';
import { useSecFilings } from '@/features/edgar/hooks/useSecFilings';
import { useSecSyncProgress } from '@/features/edgar/hooks/useSecSyncProgress';
import { useStock } from '@/features/tickers/hooks/useStock';
import { ChartAuto, PRICE_SCALE_MIN_WIDTH, formatVolumeAxis } from '@/features/charts';
import { Button } from '@/components/ui/button';
import StickyHead from '@/components/common/layout/StickyHead';
import PeriodButtons from '@/features/charts/ui/PeriodButtons';
import { defaultDate } from './shared';

// ── Sync strip (Download + progress, no date inputs) ─────────────────────────

function SyncStrip({ ticker, dateFrom, dateTo }: { ticker: string; dateFrom: string; dateTo: string }) {
  const { mutate, isPending: isStarting, error } = useSecSync();
  const { data: status } = useSecSyncStatus(ticker);
  const running = status?.running ?? false;
  const active = running || isStarting;
  const { progress, reset } = useSecSyncProgress(ticker, active);

  function run(force: boolean) {
    reset();
    mutate({ ticker, dateFrom, dateTo, force });
  }

  return (
    <div className="edgar-sync-strip">
      <span className="edgar-sync-ticker">{ticker}</span>
      <Button size="sm" disabled={active} onClick={() => run(false)}>
        {active ? 'Downloading…' : 'Download'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={active}
        onClick={() => run(true)}
        title="Re-download even if already saved"
      >
        Re-download
      </Button>
      {active && progress && (
        <>
          <div className="edgar-sync-bar-wrap">
            <div
              className="edgar-sync-bar"
              style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
            />
          </div>
          <span className="edgar-sync-label">
            {progress.current}/{progress.total} — {progress.form}
          </span>
        </>
      )}
      {active && !progress && <span className="edgar-sync-label">Fetching list…</span>}
      {error && <span className="edgar-sync-error">{(error as Error).message}</span>}
    </div>
  );
}

// ── Per-company drill-down view ───────────────────────────────────────────────

export default function SecArchiveContent({ ticker, onBack }: { ticker: string; onBack: () => void }) {
  const { data: coverage } = useSecCoverage(ticker);
  const { allQuotes } = useStock(ticker, {});
  const filings = useSecFilings(ticker);

  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string } | null>(null);
  const [period, setPeriod] = useState<number | null>(null);
  // True when the visible range came from a pan/zoom rather than a preset button.
  const [isCustomRange, setIsCustomRange] = useState(false);

  // Chart range drives the sync date window
  const [dateFrom, setDateFrom] = useState(defaultDate(30));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  function toDateStr(v: string): string {
    if (/^\d{9,}$/.test(v)) return new Date(Number(v) * 1000).toISOString().slice(0, 10);
    return v.slice(0, 10);
  }

  function applyRange(range: { from: string; to: string }) {
    const from = toDateStr(range.from);
    const to = toDateStr(range.to);
    setVisibleRange({ from, to });
    setDateFrom(from);
    setDateTo(to);
  }

  // A pan/zoom from the chart is a user-driven range that no longer matches the
  // selected period, so drop the preset and let the "Custom" label take over.
  function handleRangeChange(range: { from: string; to: string }) {
    setPeriod(null);
    setIsCustomRange(true);
    applyRange(range);
  }

  // Period buttons compute a date range from the loaded quotes and drive the
  // range (same path as panning), so the chart + download inputs stay in sync.
  const quoteDates = useMemo(() => {
    const dates = (allQuotes ?? []).map((q) => q.date.slice(0, 10)).sort();
    return { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null };
  }, [allQuotes]);

  function selectPeriod(days: number | null) {
    setPeriod(days);
    setIsCustomRange(false);
    if (days === null) {
      if (quoteDates.first && quoteDates.last) applyRange({ from: quoteDates.first, to: quoteDates.last });
      return;
    }
    if (!quoteDates.last) return;
    const d = new Date(quoteDates.last);
    d.setDate(d.getDate() - days);
    applyRange({ from: d.toISOString().slice(0, 10), to: quoteDates.last });
  }

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
      <button className="edgar-back-link" onClick={onBack}>
        ← All companies
      </button>
      <SyncStrip ticker={ticker} dateFrom={dateFrom} dateTo={dateTo} />
      <StickyHead>
        <div className="edgar-period-bar">
          <PeriodButtons activeDays={isCustomRange ? undefined : period} onSelect={selectPeriod} />
          {isCustomRange && visibleRange && (
            <span className="edgar-period-custom">
              Custom{' '}
              <span className="edgar-period-custom-range">
                {visibleRange.from} → {visibleRange.to}
              </span>
            </span>
          )}
        </div>
        <FilingsControls
          presentForms={filings.presentForms}
          enabledForms={filings.enabledForms}
          allOn={filings.allOn}
          anyOn={filings.anyOn}
          onToggleForm={filings.toggleForm}
          onToggleAll={filings.toggleAll}
        />
      </StickyHead>
      <SecPriceChart
        ticker={ticker}
        visibleRange={visibleRange}
        onRangeChange={handleRangeChange}
        defaultRange={defaultRange}
        plugins={filings.makeOverlay('sec-filings-price')}
      />
      <SecChartPanel title="Volume — Yahoo">
        <ChartAuto
          data={volumeData}
          defaultType="Histogram"
          availableTypes={['Histogram']}
          hideTypeControls
          hidePeriodControls
          visibleRange={visibleRange}
          onRangeChange={handleRangeChange}
          resize={{ enabled: true }}
          plugins={filings.makeOverlay('sec-filings-volume')}
          topScaleMargin={0.18}
          priceFormat={formatVolumeAxis}
          priceScaleMinWidth={PRICE_SCALE_MIN_WIDTH}
        />
      </SecChartPanel>

      <SecVolatilityChart
        quotes={allQuotes}
        visibleRange={visibleRange}
        onRangeChange={handleRangeChange}
        filingPlugins={filings.makeOverlay('sec-filings-volatility')}
      />
      <SecTimeline ticker={ticker} visibleRange={visibleRange} onRangeChange={handleRangeChange} />
      <SecFilingImpactTable ticker={ticker} dateRange={visibleRange} />
    </>
  );
}
