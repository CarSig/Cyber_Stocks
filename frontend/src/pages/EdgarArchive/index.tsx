import { useState, useMemo } from 'react';
import Page from '@/components/common/layout/Page';
import SecPriceChart from '@/features/edgar/components/SecPriceChart';
import SecChartPanel from '@/features/edgar/components/SecChartPanel';
import SecVolatilityChart from '@/features/edgar/components/SecVolatilityChart';
import FilingsControls from '@/features/edgar/components/FilingsControls';
import SecTimeline from '@/features/edgar/components/SecTimeline';
import SecFilingImpactTable from '@/features/edgar/components/SecFilingImpactTable';
import {
  useSecCoverage,
  useAllSecFiles,
  useSecTickers,
  useSecSync,
  useSecSyncStatus,
  useScan801,
  useScan801Status,
  useScan801Results,
} from '@/features/edgar/hooks/useSecData';
import { useSecFilings } from '@/features/edgar/hooks/useSecFilings';
import { useFilingSwings } from '@/features/edgar/hooks/useFilingSwings';
import type { FilingSwing } from '@/features/edgar/filingSwings';
import { useSecSyncProgress } from '@/features/edgar/hooks/useSecSyncProgress';
import { useScan801Progress } from '@/features/edgar/hooks/useScan801Progress';
import { useStock } from '@/features/tickers/hooks/useStock';
import { ChartAuto, PRICE_SCALE_MIN_WIDTH, formatVolumeAxis } from '@/features/charts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StickyHead from '@/components/common/layout/StickyHead';
import PeriodButtons from '@/features/charts/ui/PeriodButtons';
import FilingSimModal from '@/features/edgar/components/FilingSimModal';
import { useAggSim, AggResultBadge } from '@/features/edgar/components/FilingAggSim';
import './EdgarArchive.css';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

type EdgarTab = 'per company' | '10-K' | '8-K' | '10-Q' | '8-K incidents';
const TABS: EdgarTab[] = ['per company', '10-K', '8-K', '10-Q', '8-K incidents'];

function defaultDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

// ── Ticker card grid ─────────────────────────────────────────────────────────

function TickerCardGrid({ onSelect }: { onSelect: (t: string) => void }) {
  const { data: tickers = [], isPending } = useSecTickers();
  const { data: allListings } = useAllSecFiles(tickers);

  const countByTicker = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of allListings) {
      m[l.ticker] = (m[l.ticker] ?? 0) + 1;
    }
    return m;
  }, [allListings]);

  if (isPending) return <p className="edgar-status">Loading tickers…</p>;

  return (
    <div className="edgar-ticker-grid">
      {tickers.map((t) => (
        <button key={t} className="edgar-ticker-card" onClick={() => onSelect(t)}>
          <span className="edgar-ticker-card-symbol">{t}</span>
          {countByTicker[t] != null && <span className="edgar-ticker-card-count">{countByTicker[t]} filings</span>}
        </button>
      ))}
    </div>
  );
}

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

// ── Per-company tab ───────────────────────────────────────────────────────────

function SecArchiveContent({ ticker, onBack }: { ticker: string; onBack: () => void }) {
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

function PerCompanyTab() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  if (selectedTicker) {
    return <SecArchiveContent key={selectedTicker} ticker={selectedTicker} onBack={() => setSelectedTicker(null)} />;
  }

  return <TickerCardGrid onSelect={setSelectedTicker} />;
}

// ── Cross-company filing list tab ────────────────────────────────────────────

type SimModalState = { accession: string; form: string; filingDate: string; ticker: string };

function AllFilingsTab({ formTypes }: { formTypes: string[] }) {
  const { data: tickers = [] } = useSecTickers();
  const { data: allListings, isPending } = useAllSecFiles(tickers);
  const agg = useAggSim();
  const [simModal, setSimModal] = useState<SimModalState | null>(null);

  const [dateFrom, setDateFrom] = useState(defaultDate(365));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [exitTime] = useState<'15:45' | '15:59'>('15:45');

  const rows = useMemo(() => {
    const out: {
      ticker: string;
      accession: string;
      filingDate: string;
      form: string;
      primaryDocument: string;
      cik: string;
      items: string[];
      files: string[];
    }[] = [];

    for (const l of allListings) {
      const meta = l.meta;
      if (!meta) continue;
      if (!formTypes.includes(meta.form)) continue;
      const d = meta.filingDate;
      if (!d || d < dateFrom || d > dateTo) continue;
      out.push({
        ticker: l.ticker,
        accession: l.accession,
        filingDate: d,
        form: meta.form,
        primaryDocument: meta.primaryDocument,
        cik: meta.cik,
        items: meta.items ?? [],
        files: l.files,
      });
    }

    out.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
    return out;
  }, [allListings, formTypes, dateFrom, dateTo]);

  const aggFilings = useMemo(
    () => rows.map((r) => ({ date: r.filingDate, accession: r.accession, form: r.form, ticker: r.ticker })),
    [rows],
  );

  return (
    <>
      <div className="all-filings-controls">
        <div className="all-filings-control-field">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="all-filings-control-field">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {isPending ? (
        <p className="all-filings-status">Loading filings…</p>
      ) : (
        <>
          <div className="all-filings-summary">
            <strong>{rows.length}</strong> filing{rows.length !== 1 ? 's' : ''}
            {allListings.length === 0 && ' — sync filings from the Per Company tab first'}
            {rows.length > 0 && (
              <span style={{ marginLeft: 12 }}>
                <AggResultBadge
                  label={`All — ${formTypes.join(' / ')}`}
                  state={agg.states['__all__']}
                  showTicker
                  onRun={() => agg.run('__all__', aggFilings, exitTime)}
                />
              </span>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="all-filings-status">No filings found in this range.</p>
          ) : (
            <div className="all-filings-list">
              {rows.map((row) => {
                const accNoDashes = row.accession.replace(/-/g, '');
                const docUrl = `${EDGAR_ARCHIVES}/${row.cik}/${accNoDashes}/${row.primaryDocument}`;
                const folderUrl = `${EDGAR_ARCHIVES}/${row.cik}/${accNoDashes}/`;
                return (
                  <div key={row.accession} className="filing-row">
                    <span className="filing-row-ticker">{row.ticker}</span>
                    <span className="filing-row-date">{row.filingDate}</span>
                    <span className="filing-row-form">{row.form}</span>
                    <code className="filing-row-accession">{row.accession}</code>
                    {row.items.length > 0 && (
                      <div className="filing-row-items">
                        {row.items.map((item) => (
                          <Badge
                            key={item}
                            variant="outline"
                            className={`filing-item-badge${item === '1.05' ? ' filing-item-badge--primary' : ''}`}
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="filing-row-links">
                      {row.primaryDocument && (
                        <a href={docUrl} target="_blank" rel="noreferrer" className="filing-row-link">
                          Doc ↗
                        </a>
                      )}
                      <a
                        href={folderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="filing-row-link filing-row-link--secondary"
                      >
                        All files ({row.files.length}) ↗
                      </a>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ fontSize: 11, padding: '2px 7px', height: 'auto' }}
                      onClick={() =>
                        setSimModal({
                          accession: row.accession,
                          form: row.form,
                          filingDate: row.filingDate,
                          ticker: row.ticker,
                        })
                      }
                    >
                      AI Sim
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {simModal && <FilingSimModal open onClose={() => setSimModal(null)} filing={simModal} />}
    </>
  );
}

// ── 8-K Incidents tab ────────────────────────────────────────────────────────

// Rare, high-signal distress items worth surfacing alongside 1.05. Deliberately
// excludes high-frequency items that would swamp the list: 8.01 (catch-all
// "Other Events" — e.g. CrowdStrike's 2024 outage, but also buybacks/blog
// pointers) and 5.02 (exec/director changes — fires on every routine board
// appointment, ~200+ filings here vs. a handful for the items below).
const NOTABLE_ITEMS: Record<string, string> = {
  '1.05': 'Cybersecurity incident',
  '4.02': 'Non-reliance on financials',
  '2.04': 'Debt acceleration / default',
  '3.01': 'Delisting notice',
  '4.01': 'Auditor change',
};

type IncidentRow = {
  ticker: string;
  accession: string;
  filingDate: string;
  reportDate?: string;
  primaryDocument: string;
  cik: string;
  items: string[];
  files: string[];
};

function IncidentCard({ row }: { row: IncidentRow }) {
  const accNoDashes = row.accession.replace(/-/g, '');
  const docUrl = `${EDGAR_ARCHIVES}/${row.cik}/${accNoDashes}/${row.primaryDocument}`;
  const folderUrl = `${EDGAR_ARCHIVES}/${row.cik}/${accNoDashes}/`;
  const isCyber = row.items.includes('1.05');
  return (
    <div className={`incident-card${isCyber ? '' : ' incident-card--notable'}`}>
      <div className="incident-card-header">
        <span className="incident-ticker">{row.ticker}</span>
        <span className="incident-date">{row.filingDate}</span>
        {row.reportDate && row.reportDate !== row.filingDate && (
          <span className="incident-report-date">event: {row.reportDate}</span>
        )}
        <div className="incident-items">
          {row.items.map((item) => {
            const label = NOTABLE_ITEMS[item];
            return (
              <Badge
                key={item}
                variant="outline"
                className={`incident-item-badge${item === '1.05' ? ' incident-item-badge--primary' : ''}`}
                title={label}
              >
                {item}
                {label && <span className="incident-item-label">{label}</span>}
              </Badge>
            );
          })}
        </div>
      </div>
      <div className="incident-card-body">
        <code className="incident-accession">{row.accession}</code>
        <div className="incident-links">
          {row.primaryDocument && (
            <a href={docUrl} target="_blank" rel="noreferrer" className="incident-link">
              Primary doc ↗
            </a>
          )}
          <a href={folderUrl} target="_blank" rel="noreferrer" className="incident-link incident-link--secondary">
            All files ({row.files.length}) ↗
          </a>
        </div>
      </div>
    </div>
  );
}

type IncidentMode = 'cyber' | 'notable' | 'scan801';

// Metadata-driven view: filters downloaded filings by their SEC item numbers.
function MetadataIncidentList({ notableOnly }: { notableOnly: boolean }) {
  const { data: tickers = [] } = useSecTickers();
  const { data: allListings, isPending } = useAllSecFiles(tickers);

  const { incidents, totalFilings } = useMemo(() => {
    const inc: IncidentRow[] = [];
    let total = 0;
    for (const l of allListings) {
      const meta = l.meta;
      if (!meta?.filingDate) continue;
      total++;
      const items = meta.items ?? [];
      const match = notableOnly ? items.some((i) => i in NOTABLE_ITEMS) : items.includes('1.05');
      if (!match) continue;
      inc.push({
        ticker: l.ticker,
        accession: l.accession,
        filingDate: meta.filingDate,
        reportDate: meta.reportDate,
        primaryDocument: meta.primaryDocument,
        cik: meta.cik,
        items,
        files: l.files,
      });
    }
    inc.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
    return { incidents: inc, totalFilings: total };
  }, [allListings, notableOnly]);

  if (isPending) return <p className="incident-status">Loading filings…</p>;

  return (
    <div className="incident-results">
      <div className="incident-summary">
        <strong>{incidents.length}</strong> {notableOnly ? 'notable filing' : 'material cybersecurity incident'}
        {incidents.length !== 1 ? 's' : ''}
        {notableOnly ? '' : ' (item 1.05)'}
        {' — '}
        <span className="incident-summary-total">{totalFilings} total 8-K filings downloaded</span>
      </div>
      {incidents.length === 0 ? (
        <p className="incident-status">
          {notableOnly ? 'No notable filings found.' : 'No 1.05 filings found.'}{' '}
          {allListings.length === 0
            ? 'No filings downloaded yet — sync from the Per Company tab first.'
            : 'Try syncing more filings.'}
        </p>
      ) : (
        <div className="incident-list">
          {incidents.map((row) => (
            <IncidentCard key={row.accession} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

// Scanned 8.01 view: triggers a body keyword scan, shows progress, renders matches.
function swingPct(val: number, signed = false): string {
  const s = signed && val > 0 ? '+' : '';
  return `${s}${val.toFixed(1)}%`;
}

// Price / volume / volatility reaction chips for an incident card. Price &
// volume are signed (direction matters); volatility (True Range) is magnitude.
function IncidentSwings({ swing }: { swing?: FilingSwing }) {
  if (!swing) return null;
  const signClass = (v: number) => (v >= 0 ? 'incident-swing--up' : 'incident-swing--down');
  return (
    <div className="incident-swings">
      <span className={`incident-swing ${signClass(swing.changePct)}`} title="Price swing: baseline close → next close">
        Price {swingPct(swing.changePct, true)}
      </span>
      {swing.volSpikePct != null && (
        <span
          className={`incident-swing ${signClass(swing.volSpikePct)}`}
          title="Volume swing: filing-day volume vs prior 20-day average"
        >
          Vol {swingPct(swing.volSpikePct, true)}
        </span>
      )}
      {swing.trueRangePct != null && (
        <span className="incident-swing" title="Volatility: True Range vs prior close (overnight gap + intraday)">
          Volatility {swingPct(swing.trueRangePct)}
        </span>
      )}
    </div>
  );
}

function Scanned801View() {
  const scan = useScan801();
  const { data: status } = useScan801Status();
  const { data: results = [], isPending } = useScan801Results();
  const running = status?.running ?? false;
  const active = running || scan.isPending;
  const { progress, reset } = useScan801Progress(active);

  // Price / volume / volatility reaction per incident, around its filing date.
  const swingRows = useMemo(
    () => results.map((r) => ({ key: r.accession, ticker: r.ticker, filingDate: r.filing_date })),
    [results],
  );
  const swings = useFilingSwings(swingRows);

  function runScan() {
    reset();
    scan.mutate();
  }

  return (
    <div className="incident-results">
      <div className="incident-scan-strip">
        <Button size="sm" disabled={active} onClick={runScan}>
          {active ? 'Scanning…' : 'Scan now'}
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
              {progress.current}/{progress.total} — {progress.matched} matched
            </span>
          </>
        )}
        {active && !progress && <span className="edgar-sync-label">Starting scan…</span>}
        {scan.error && <span className="edgar-sync-error">{(scan.error as Error).message}</span>}
      </div>

      <div className="incident-summary">
        <strong>{results.length}</strong> 8.01 filing{results.length !== 1 ? 's' : ''} matched cyber/outage keywords
      </div>

      {isPending ? (
        <p className="incident-status">Loading scan results…</p>
      ) : results.length === 0 ? (
        <p className="incident-status">
          No matches yet. Click <strong>Scan now</strong> to fetch and scan 8.01 filing bodies (first run downloads
          bodies from SEC and may take a minute).
        </p>
      ) : (
        <div className="incident-list">
          {results.map((r) => {
            const accNoDashes = r.accession.replace(/-/g, '');
            const docUrl = `${EDGAR_ARCHIVES}/${r.issuer_cik}/${accNoDashes}/`;
            const confirmed = r.ai_real_incident === true;
            const pending = r.ai_real_incident === null;
            const conf = r.ai_confidence != null ? Math.round(Number(r.ai_confidence) * 100) : null;
            return (
              <div key={r.accession} className={`incident-card${confirmed ? '' : ' incident-card--notable'}`}>
                <div className="incident-card-header">
                  <span className="incident-ticker">{r.ticker}</span>
                  <span className="incident-date">{r.filing_date}</span>
                  {r.report_period && r.report_period !== r.filing_date && (
                    <span className="incident-report-date">event: {r.report_period}</span>
                  )}
                  {confirmed && r.ai_incident_type && r.ai_incident_type !== 'none' && (
                    <Badge variant="outline" className="incident-item-badge incident-item-badge--primary">
                      {r.ai_incident_type}
                      {conf != null ? ` · ${conf}%` : ''}
                    </Badge>
                  )}
                  {pending && (
                    <Badge variant="outline" className="incident-item-badge">
                      unclassified
                    </Badge>
                  )}
                  <div className="incident-items">
                    {r.matched_keywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="incident-item-badge incident-item-keyword">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
                {r.ai_summary && <p className="incident-snippet">{r.ai_summary}</p>}
                {!r.ai_summary && r.snippet && <p className="incident-snippet">…{r.snippet}…</p>}
                <IncidentSwings swing={swings.get(r.accession)} />
                <div className="incident-card-body">
                  <code className="incident-accession">{r.accession}</code>
                  <div className="incident-links">
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="incident-link incident-link--secondary"
                    >
                      All files ↗
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IncidentsTab() {
  const [mode, setMode] = useState<IncidentMode>('cyber');

  return (
    <div>
      <p className="incident-intro">
        SEC Rule 8-K Item 1.05 — Material Cybersecurity Incidents. Companies must disclose material cyber incidents
        within 4 business days of determining materiality. Note: operational events not caused by a cyberattack (e.g.
        CrowdStrike's 2024 Falcon outage) file under Item 8.01, not 1.05 — use the scanned view to catch those. Sourced
        from locally downloaded EDGAR archives — sync from the Per Company tab.
      </p>
      <div className="incident-toggle">
        <button
          className={`incident-toggle-btn${mode === 'cyber' ? ' incident-toggle-btn--active' : ''}`}
          onClick={() => setMode('cyber')}
        >
          Cyber (1.05) only
        </button>
        <button
          className={`incident-toggle-btn${mode === 'notable' ? ' incident-toggle-btn--active' : ''}`}
          onClick={() => setMode('notable')}
          title={Object.entries(NOTABLE_ITEMS)
            .map(([k, v]) => `${k} ${v}`)
            .join('\n')}
        >
          All notable items
        </button>
        <button
          className={`incident-toggle-btn${mode === 'scan801' ? ' incident-toggle-btn--active' : ''}`}
          onClick={() => setMode('scan801')}
          title="Scan 8.01 ('Other Events') filing bodies for cyber/outage/breach keywords"
        >
          Cyber 8.01 (scanned)
        </button>
      </div>
      {mode === 'scan801' ? <Scanned801View /> : <MetadataIncidentList notableOnly={mode === 'notable'} />}
    </div>
  );
}

// ── Page root ────────────────────────────────────────────────────────────────

export default function SecArchive() {
  const [activeTab, setActiveTab] = useState<EdgarTab>('per company');

  return (
    <Page title="SEC EDGAR Archive">
      <nav className="edgar-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`edgar-tab${activeTab === tab ? ' edgar-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {activeTab === 'per company' && <PerCompanyTab />}
      {activeTab === '10-K' && <AllFilingsTab formTypes={['10-K', '10-K/A']} />}
      {activeTab === '8-K' && <AllFilingsTab formTypes={['8-K', '8-K/A']} />}
      {activeTab === '10-Q' && <AllFilingsTab formTypes={['10-Q', '10-Q/A']} />}
      {activeTab === '8-K incidents' && <IncidentsTab />}
    </Page>
  );
}
