import { useState, useMemo } from 'react';
import Page from '@/components/common/layout/Page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSecTickers, useAllSecFiles, useSecFiles } from '@/features/edgar/hooks/useSecData';
import './EdgarIncidents.css';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
const ALL = 'ALL';

function defaultDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

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

  return (
    <div className="incident-card">
      <div className="incident-card-header">
        <span className="incident-ticker">{row.ticker}</span>
        <span className="incident-date">{row.filingDate}</span>
        {row.reportDate && row.reportDate !== row.filingDate && (
          <span className="incident-report-date">event: {row.reportDate}</span>
        )}
        <div className="incident-items">
          {row.items.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className={`incident-item-badge${item === '1.05' ? ' incident-item-badge--primary' : ''}`}
            >
              {item}
            </Badge>
          ))}
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

function AllIncidentList({ tickers, dateFrom, dateTo }: { tickers: string[]; dateFrom: string; dateTo: string }) {
  const { data: allListings, isPending } = useAllSecFiles(tickers);

  const { incidents, totalFilings } = useMemo(() => {
    const inc: IncidentRow[] = [];
    let total = 0;
    for (const l of allListings) {
      const meta = l.meta;
      if (!meta) continue;
      const d = meta.filingDate;
      if (!d || d < dateFrom || d > dateTo) continue;
      total++;
      if (!meta.items?.includes('1.05')) continue;
      inc.push({
        ticker: l.ticker,
        accession: l.accession,
        filingDate: d,
        reportDate: meta.reportDate,
        primaryDocument: meta.primaryDocument,
        cik: meta.cik,
        items: meta.items ?? [],
        files: l.files,
      });
    }
    inc.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
    return { incidents: inc, totalFilings: total };
  }, [allListings, dateFrom, dateTo]);

  if (isPending) return <p className="incident-status">Loading filings…</p>;

  return <IncidentResults incidents={incidents} totalFilings={totalFilings} allListingsCount={allListings.length} />;
}

function SingleIncidentList({ ticker, dateFrom, dateTo }: { ticker: string; dateFrom: string; dateTo: string }) {
  const { data: listings = [], isPending, isError } = useSecFiles(ticker);

  const { incidents, totalFilings } = useMemo(() => {
    const inc: IncidentRow[] = [];
    let total = 0;
    for (const l of listings) {
      const meta = l.meta;
      if (!meta) continue;
      const d = meta.filingDate;
      if (!d || d < dateFrom || d > dateTo) continue;
      total++;
      if (!meta.items?.includes('1.05')) continue;
      inc.push({
        ticker,
        accession: l.accession,
        filingDate: d,
        reportDate: meta.reportDate,
        primaryDocument: meta.primaryDocument,
        cik: meta.cik,
        items: meta.items ?? [],
        files: l.files,
      });
    }
    inc.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
    return { incidents: inc, totalFilings: total };
  }, [listings, ticker, dateFrom, dateTo]);

  if (isPending) return <p className="incident-status">Loading filings for {ticker}…</p>;
  if (isError) return <p className="incident-status incident-status--error">Failed to load filings for {ticker}.</p>;

  return <IncidentResults incidents={incidents} totalFilings={totalFilings} allListingsCount={listings.length} />;
}

function IncidentResults({
  incidents,
  totalFilings,
  allListingsCount,
}: {
  incidents: IncidentRow[];
  totalFilings: number;
  allListingsCount: number;
}) {
  return (
    <div className="incident-results">
      <div className="incident-summary">
        <strong>{incidents.length}</strong> material cybersecurity incident{incidents.length !== 1 ? 's' : ''} (item
        1.05)
        {' — '}
        <span className="incident-summary-total">{totalFilings} total 8-K filings in range</span>
      </div>

      {incidents.length === 0 ? (
        <p className="incident-status">
          No 1.05 filings found in this range.{' '}
          {allListingsCount === 0
            ? 'No filings downloaded yet — sync from the EDGAR Archive page first.'
            : 'Try widening the date range, or sync more filings from the EDGAR Archive page.'}
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

export default function EdgarIncidents() {
  const { data: tickers = [] } = useSecTickers();
  const [ticker, setTicker] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState(defaultDate(365));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Page title="8-K Material Cybersecurity Incidents (Item 1.05)">
      <p className="incident-intro">
        SEC Rule 8-K Item 1.05 — Material Cybersecurity Incidents. Companies must disclose material cyber incidents
        within 4 business days of determining materiality. Filings are sourced from locally downloaded EDGAR archives —
        sync new filings from the EDGAR Archive page.
      </p>

      <div className="incident-controls">
        <div className="incident-control-field">
          <Label>Ticker</Label>
          <Select value={ticker} onValueChange={(v) => setTicker(v ?? ALL)}>
            <SelectTrigger className="incident-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tickers</SelectItem>
              {tickers.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="incident-control-field">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>

        <div className="incident-control-field">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {ticker === ALL ? (
        <AllIncidentList tickers={tickers} dateFrom={dateFrom} dateTo={dateTo} />
      ) : (
        <SingleIncidentList ticker={ticker} dateFrom={dateFrom} dateTo={dateTo} />
      )}
    </Page>
  );
}
