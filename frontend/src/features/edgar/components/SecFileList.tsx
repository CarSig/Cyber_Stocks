import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSecFiles } from '../hooks/useSecData';
import { getFormStyle } from '../utils/forms';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

type Props = {
  ticker: string | null;
};

export default function SecFileList({ ticker }: Props) {
  const { data: listings = [], isPending } = useSecFiles(ticker);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!ticker) return null;
  if (isPending) return <p className="sec-loading">Loading files…</p>;
  if (listings.length === 0) return <p className="sec-empty">No files downloaded for {ticker} yet.</p>;

  function toggle(acc: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) {
        next.delete(acc);
      } else {
        next.add(acc);
      }
      return next;
    });
  }

  return (
    <div className="sec-section">
      <h2 className="sec-section-title">Downloaded Filings — {ticker}</h2>
      <div className="sec-file-list">
        {listings.map((l) => {
          const accNoDashes = l.accession.replace(/-/g, '');
          const { cik, filingDate, form, primaryDocument, items } = l.meta ?? {};
          const baseUrl = cik ? `${EDGAR_ARCHIVES}/${cik}/${accNoDashes}` : null;
          const formStyle = getFormStyle(form);

          // Sort: primary doc first, then alphabetical
          const sortedFiles = [...l.files].sort((a, b) => {
            if (a === primaryDocument) return -1;
            if (b === primaryDocument) return 1;
            return a.localeCompare(b);
          });

          return (
            <div key={l.accession} className="sec-accession">
              <button type="button" className="sec-accession-header" onClick={() => toggle(l.accession)}>
                {formStyle && (
                  <span className="sec-form-tag" style={{ background: formStyle.color }}>
                    {formStyle.label}
                  </span>
                )}
                {items && items.length > 0 && (
                  <span className="sec-item-codes">
                    {items.map((it) => (
                      <Badge key={it} variant="outline" className="sec-item-badge">
                        {it}
                      </Badge>
                    ))}
                  </span>
                )}
                <span className="sec-accession-name">{l.accession}</span>
                {filingDate && <span className="sec-filing-date">{filingDate}</span>}
                <Badge variant="outline">{l.files.length} files</Badge>
                <span className="sec-chevron">{expanded.has(l.accession) ? '▲' : '▼'}</span>
              </button>
              {expanded.has(l.accession) && (
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
    </div>
  );
}
