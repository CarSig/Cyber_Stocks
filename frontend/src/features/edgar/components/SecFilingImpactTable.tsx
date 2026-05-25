import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSecFilingImpact } from '../hooks/useSecFilingImpact';
import { useSecFiles } from '../hooks/useSecData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFormStyle } from '../utils';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

function fmtPct(val: number, signed = false): string {
  const s = signed && val > 0 ? '+' : '';
  return `${s}${val.toFixed(2)}%`;
}

type Props = { ticker: string };

export default function SecFilingImpactTable({ ticker }: Props) {
  const [lagDays, setLagDays] = useState(1);
  const groups = useSecFilingImpact(ticker, lagDays);
  const { data: listings = [], isPending } = useSecFiles(ticker);

  // Two levels of expansion: form group and individual accession
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedAccessions, setExpandedAccessions] = useState<Set<string>>(new Set());

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

  // Filings that have no price impact data (no quote coverage) — show ungrouped at bottom
  const impactAccessions = new Set(groups.flatMap((g) => g.filings.map((f) => f.accession)));
  const ungroupedListings = listings.filter((l) => !impactAccessions.has(l.accession));

  return (
    <div className="sec-section">
      <div className="sec-impact-header">
        <h2 className="sec-section-title">Downloaded Filings — {ticker}</h2>
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
                </tr>

                {/* Individual filing rows */}
                {isOpen &&
                  group.filings.map((f) => {
                    const fGainClass = f.changePct >= 0 ? 'sec-impact-positive' : 'sec-impact-negative';
                    const listing = listingByAccession.get(f.accession);
                    const isAccOpen = expandedAccessions.has(f.accession);

                    const accNoDashes = f.accession.replace(/-/g, '');
                    const baseUrl = listing?.cik ? `${EDGAR_ARCHIVES}/${listing.cik}/${accNoDashes}` : null;
                    const sortedFiles = listing
                      ? [...listing.files].sort((a, b) => {
                          if (a === listing.primaryDoc) return -1;
                          if (b === listing.primaryDoc) return 1;
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
                        </tr>

                        {/* File drill-down */}
                        {isAccOpen && sortedFiles.length > 0 && (
                          <tr key={`${f.accession}-files`} className="sec-impact-files-row">
                            <td colSpan={4} className="sec-impact-files-cell">
                              <ul className="sec-file-items">
                                {sortedFiles.map((file) => {
                                  const isPrimary = !!listing?.primaryDoc && file === listing.primaryDoc;
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
          <p className="sec-empty" style={{ marginBottom: '0.5rem' }}>
            {ungroupedListings.length} filing{ungroupedListings.length > 1 ? 's' : ''} outside price data coverage
          </p>
          {ungroupedListings.map((l) => {
            const accNoDashes = l.accession.replace(/-/g, '');
            const baseUrl = l.cik ? `${EDGAR_ARCHIVES}/${l.cik}/${accNoDashes}` : null;
            const formStyle = getFormStyle(l.form);
            const isOpen = expandedAccessions.has(l.accession);
            const sortedFiles = [...l.files].sort((a, b) => {
              if (a === l.primaryDoc) return -1;
              if (b === l.primaryDoc) return 1;
              return a.localeCompare(b);
            });

            return (
              <div key={l.accession} className="sec-accession">
                <button type="button" className="sec-accession-header" onClick={() => toggleAccession(l.accession)}>
                  <span className="sec-form-tag" style={{ background: formStyle.color }}>
                    {formStyle.label}
                  </span>
                  <span className="sec-accession-name">{l.accession}</span>
                  {l.date && <span className="sec-filing-date">{l.date}</span>}
                  <Badge variant="outline">{l.files.length} files</Badge>
                  <span className="sec-chevron">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <ul className="sec-file-items">
                    {sortedFiles.map((f) => {
                      const isPrimary = !!l.primaryDoc && f === l.primaryDoc;
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
    </div>
  );
}
