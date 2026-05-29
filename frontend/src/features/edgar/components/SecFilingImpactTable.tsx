import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSecFilingImpact } from '../hooks/useSecFilingImpact';
import { useSecFiles } from '../hooks/useSecData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFormStyle } from '../utils';
import FilingSimModal from './FilingSimModal';
import { useAggSim, AggResultBadge } from './FilingAggSim';

type SimModalState = {
  accession: string;
  form: string;
  filingDate: string;
  ticker: string;
};

function useFilingSim() {
  const [modal, setModal] = useState<SimModalState | null>(null);
  return {
    modal,
    open: (state: SimModalState) => setModal(state),
    close: () => setModal(null),
  };
}


const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

function fmtPct(val: number, signed = false): string {
  const s = signed && val > 0 ? '+' : '';
  return `${s}${val.toFixed(2)}%`;
}

type Props = { ticker: string; dateRange?: { from: string; to: string } | null };

export default function SecFilingImpactTable({ ticker, dateRange }: Props) {
  const [lagDays, setLagDays] = useState(1);
  const [exitTime] = useState<'15:45' | '15:59'>('15:45');
  const groups = useSecFilingImpact(ticker, lagDays, dateRange);
  const { data: listings = [], isPending } = useSecFiles(ticker);
  const sim = useFilingSim();
  const agg = useAggSim();

  // Two levels of expansion: form group and individual accession
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedAccessions, setExpandedAccessions] = useState<Set<string>>(new Set());
  const [ungroupedOpen, setUngroupedOpen] = useState(false);

  if (isPending) return <p className="sec-loading">Loading filings…</p>;
  if (listings.length === 0) return <p className="sec-empty">No files downloaded for {ticker} yet.</p>;

  // Build a map from accession → listing for file drill-down
  const listingByAccession = new Map(listings.map((l) => [l.accession, l]));

  function toggleGroup(form: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(form)) {
        next.delete(form);
      } else {
        next.add(form);
      }
      return next;
    });
  }

  function toggleAccession(acc: string) {
    setExpandedAccessions((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) {
        next.delete(acc);
      } else {
        next.add(acc);
      }
      return next;
    });
  }

  // Filings that have no price impact data (no quote coverage) — show ungrouped at
  // bottom. When a date range is active, also drop filings outside it so they
  // don't masquerade as "outside coverage".
  const impactAccessions = new Set(groups.flatMap((g) => g.filings.map((f) => f.accession)));
  const inRange = (d?: string) =>
    !dateRange || (!!d && (!dateRange.from || d >= dateRange.from) && (!dateRange.to || d <= dateRange.to));
  const ungroupedListings = listings.filter(
    (l) => !impactAccessions.has(l.accession) && inRange(l.meta?.filingDate),
  );

  return (
    <div className="sec-section">
      <div className="sec-impact-header">
        <h2 className="sec-section-title">
          Downloaded Filings — {ticker}
          {dateRange && (
            <span className="sec-impact-range-note">
              {dateRange.from} → {dateRange.to}
            </span>
          )}
        </h2>
        <AggResultBadge
          label={`All forms — ${ticker}`}
          state={agg.states['__all__']}
          onRun={() => agg.run('__all__', groups.flatMap((g) => g.filings.map((f) => ({ ...f, ticker }))), exitTime)}
        />
        <div className="sec-impact-lag">
          <Label htmlFor="sec-lag" className="sec-impact-lag-label">
            Lag days
          </Label>
          <Input
            id="sec-lag"
            type="number"
            min={1}
            max={30}
            value={lagDays}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1 && v <= 30) setLagDays(v);
            }}
            className="sec-impact-lag-input"
          />
        </div>
      </div>

      <table className="sec-impact-table">
        <thead>
          <tr className="sec-impact-head-row">
            <th className="sec-impact-th">Form</th>
            <th className="sec-impact-th sec-impact-th--count">#</th>
            <th className="sec-impact-th sec-impact-th--num">Avg Swing |Δ|</th>
            <th className="sec-impact-th sec-impact-th--num">Avg Gain / Loss</th>
            <th className="sec-impact-th sec-impact-th--num" title="Filing day open → close (daily quotes)">Intraday O→C</th>
            <th className="sec-impact-th sec-impact-th--num" title="True Range vs prior close: gap from yesterday's close + intraday high–low swing">Avg Volatility</th>
            <th className="sec-impact-th sec-impact-th--num" title="Filing-day volume vs prior 20-day average">Avg Vol Swing</th>
            <th className="sec-impact-th" />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const style = getFormStyle(group.form);
            const isOpen = expandedGroups.has(group.form);
            const gainClass = group.avgChangePct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative';

            return (
              <>
                {/* Group header row */}
                <tr key={group.form} className="sec-impact-group-row" onClick={() => toggleGroup(group.form)}>
                  <td className="sec-impact-td">
                    <span className="sec-impact-chevron">{isOpen ? '▼' : '▶'}</span>
                    <span className="sec-form-tag" style={{ background: style.color }}>
                      {style.label}
                    </span>
                  </td>
                  <td className="sec-impact-td sec-impact-count">{group.filings.length}</td>
                  <td className="sec-impact-td sec-impact-swing">{fmtPct(group.avgSwing)}</td>
                  <td className={`sec-impact-td sec-impact-signed ${gainClass}`}>{fmtPct(group.avgChangePct, true)}</td>
                  <td className={`sec-impact-td sec-impact-signed ${group.avgIntradayPct != null ? (group.avgIntradayPct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative') : ''}`}>
                    {group.avgIntradayPct != null ? fmtPct(group.avgIntradayPct, true) : '—'}
                  </td>
                  <td className="sec-impact-td sec-impact-swing">
                    {group.avgTrueRangePct != null ? fmtPct(group.avgTrueRangePct) : '—'}
                  </td>
                  <td className={`sec-impact-td sec-impact-signed ${group.avgVolSpikePct != null ? (group.avgVolSpikePct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative') : ''}`}>
                    {group.avgVolSpikePct != null ? fmtPct(group.avgVolSpikePct, true) : '—'}
                  </td>
                  <td className="sec-impact-td" style={{ width: 1, whiteSpace: 'nowrap' }}>
                    <span onClick={(e) => e.stopPropagation()}>
                      <AggResultBadge
                        label={`${group.form} — ${ticker}`}
                        state={agg.states[group.form]}
                        onRun={() => agg.run(group.form, group.filings.map((f) => ({ ...f, ticker })), exitTime)}
                      />
                    </span>
                  </td>
                </tr>

                {/* Individual filing rows */}
                {isOpen &&
                  group.filings.map((f) => {
                    const fGainClass = f.changePct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative';
                    const listing = listingByAccession.get(f.accession);
                    const isAccOpen = expandedAccessions.has(f.accession);

                    const accNoDashes = f.accession.replace(/-/g, '');
                    const baseUrl = listing?.meta?.cik ? `${EDGAR_ARCHIVES}/${listing.meta.cik}/${accNoDashes}` : null;
                    const sortedFiles = listing
                      ? [...listing.files].sort((a, b) => {
                          if (a === listing.meta?.primaryDocument) return -1;
                          if (b === listing.meta?.primaryDocument) return 1;
                          return a.localeCompare(b);
                        })
                      : [];

                    return (
                      <>
                        <tr
                          key={f.accession}
                          className="sec-impact-filing-row sec-impact-filing-row--clickable"
                          onClick={() => listing && toggleAccession(f.accession)}
                        >
                          <td className="sec-impact-td sec-impact-filing-date" colSpan={2}>
                            {listing && (
                              <span className="sec-impact-chevron sec-impact-chevron--sm">{isAccOpen ? '▼' : '▶'}</span>
                            )}
                            <span className="sec-impact-date">{f.date}</span>
                            <span className="sec-impact-accession">{f.accession}</span>
                            {listing?.meta?.items && listing.meta.items.length > 0 && (
                              <span className="sec-item-codes">
                                {listing.meta.items.map((it) => (
                                  <Badge key={it} variant="outline" className="sec-item-badge">
                                    {it}
                                  </Badge>
                                ))}
                              </span>
                            )}
                            {listing && (
                              <Badge variant="outline" className="sec-impact-file-badge">
                                {listing.files.length} files
                              </Badge>
                            )}
                          </td>
                          <td className="sec-impact-td sec-impact-swing">{fmtPct(f.swing)}</td>
                          <td className={`sec-impact-td sec-impact-signed ${fGainClass}`}>
                            {fmtPct(f.changePct, true)}
                          </td>
                          <td className={`sec-impact-td sec-impact-signed ${f.intradayPct != null ? (f.intradayPct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative') : ''}`}>
                            {f.intradayPct != null ? fmtPct(f.intradayPct, true) : '—'}
                          </td>
                          <td className="sec-impact-td sec-impact-swing">
                            {f.trueRangePct != null ? fmtPct(f.trueRangePct) : '—'}
                          </td>
                          <td className={`sec-impact-td sec-impact-signed ${f.volSpikePct != null ? (f.volSpikePct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative') : ''}`}>
                            {f.volSpikePct != null ? fmtPct(f.volSpikePct, true) : '—'}
                          </td>
                          <td className="sec-impact-td" style={{ width: 1, whiteSpace: 'nowrap' }}>
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ fontSize: 11, padding: '2px 7px', height: 'auto' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                sim.open({ accession: f.accession, form: listing?.meta?.form ?? '', filingDate: f.date, ticker });
                              }}
                            >
                              AI Sim
                            </Button>
                          </td>
                        </tr>

                        {/* File drill-down */}
                        {isAccOpen && sortedFiles.length > 0 && (
                          <tr key={`${f.accession}-files`} className="sec-impact-files-row">
                            <td colSpan={8} className="sec-impact-files-cell">
                              <ul className="sec-file-items">
                                {sortedFiles.map((file) => {
                                  const isPrimary = !!listing?.meta?.primaryDocument && file === listing.meta.primaryDocument;
                                  return (
                                    <li
                                      key={file}
                                      className={`sec-file-item${isPrimary ? ' sec-file-item--primary' : ''}`}
                                    >
                                      {isPrimary && <span className="sec-primary-tag">PRIMARY</span>}
                                      {baseUrl ? (
                                        <a
                                          href={`${baseUrl}/${file}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="sec-file-link"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {file} ↗
                                        </a>
                                      ) : (
                                        file
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
              </>
            );
          })}
        </tbody>
      </table>

      {/* Filings outside quote coverage — no price impact computable */}
      {ungroupedListings.length > 0 && (
        <div className="sec-file-list" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="sec-accession-header"
            onClick={() => setUngroupedOpen((v) => !v)}
            style={{ marginBottom: ungroupedOpen ? '0.5rem' : 0 }}
          >
            <span className="sec-chevron">{ungroupedOpen ? '▲' : '▼'}</span>
            <span style={{ fontWeight: 500 }}>
              {ungroupedListings.length} filing{ungroupedListings.length > 1 ? 's' : ''} outside price data coverage
            </span>
          </button>
          {ungroupedOpen && ungroupedListings.map((l) => {
            const accNoDashes = l.accession.replace(/-/g, '');
            const { cik, filingDate, form, primaryDocument } = l.meta ?? {};
            const baseUrl = cik ? `${EDGAR_ARCHIVES}/${cik}/${accNoDashes}` : null;
            const formStyle = getFormStyle(form);
            const isOpen = expandedAccessions.has(l.accession);
            const sortedFiles = [...l.files].sort((a, b) => {
              if (a === primaryDocument) return -1;
              if (b === primaryDocument) return 1;
              return a.localeCompare(b);
            });

            return (
              <div key={l.accession} className="sec-accession">
                <button type="button" className="sec-accession-header" onClick={() => toggleAccession(l.accession)}>
                  <span className="sec-form-tag" style={{ background: formStyle.color }}>
                    {formStyle.label}
                  </span>
                  <span className="sec-accession-name">{l.accession}</span>
                  {filingDate && <span className="sec-filing-date">{filingDate}</span>}
                  <Badge variant="outline">{l.files.length} files</Badge>
                  <span className="sec-chevron">{isOpen ? '▲' : '▼'}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ fontSize: 11, padding: '2px 7px', height: 'auto', marginLeft: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      sim.open({ accession: l.accession, form: form ?? '', filingDate: filingDate ?? '', ticker });
                    }}
                  >
                    AI Sim
                  </Button>
                </button>
                {isOpen && (
                  <ul className="sec-file-items">
                    {sortedFiles.map((f) => {
                      const isPrimary = !!primaryDocument && f === primaryDocument;
                      return (
                        <li key={f} className={`sec-file-item${isPrimary ? ' sec-file-item--primary' : ''}`}>
                          {isPrimary && <span className="sec-primary-tag">PRIMARY</span>}
                          {baseUrl ? (
                            <a href={`${baseUrl}/${f}`} target="_blank" rel="noreferrer" className="sec-file-link">
                              {f} ↗
                            </a>
                          ) : (
                            f
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sim.modal && (
        <FilingSimModal
          open
          onClose={sim.close}
          filing={sim.modal}
        />
      )}
    </div>
  );
}
