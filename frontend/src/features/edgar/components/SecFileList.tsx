import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSecFiles } from '../hooks/useSecData';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

const FORM_PATTERNS: { pattern: RegExp; label: string; color: string }[] = [
  { pattern: /^10-K/i, label: '10-K', color: '#4f8ef7' },
  { pattern: /^10-Q/i, label: '10-Q', color: '#7c6af7' },
  { pattern: /^8-K\/A/i, label: '8-K/A', color: '#f7c44f' },
  { pattern: /^8-K/i, label: '8-K', color: '#f7a84f' },
  { pattern: /^DEFA14A/i, label: 'DEFA14A', color: '#4fc9f7' },
  { pattern: /^DEF\s?14A/i, label: 'DEF 14A', color: '#4fc9f7' },
  { pattern: /^SC\s?13G/i, label: 'SC 13G', color: '#a0f74f' },
  { pattern: /^SC\s?13D/i, label: 'SC 13D', color: '#f74f4f' },
];

function getFormStyle(form?: string): { label: string; color: string } | null {
  if (!form) return null;
  return FORM_PATTERNS.find((p) => p.pattern.test(form)) ?? null;
}

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
          const baseUrl = l.cik ? `${EDGAR_ARCHIVES}/${l.cik}/${accNoDashes}` : null;
          const formStyle = getFormStyle(l.form);

          // Sort: primary doc first, then alphabetical
          const sortedFiles = [...l.files].sort((a, b) => {
            if (a === l.primaryDoc) return -1;
            if (b === l.primaryDoc) return 1;
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
                <span className="sec-accession-name">{l.accession}</span>
                {l.date && <span className="sec-filing-date">{l.date}</span>}
                <Badge variant="outline">{l.files.length} files</Badge>
                <span className="sec-chevron">{expanded.has(l.accession) ? '▲' : '▼'}</span>
              </button>
              {expanded.has(l.accession) && (
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
    </div>
  );
}
