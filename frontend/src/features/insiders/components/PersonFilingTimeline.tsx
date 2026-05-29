import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getFormStyle } from '@/features/edgar/utils/forms';
import type { InsiderFiling } from '@algo/shared';
import ImpactBadge from './ImpactBadge';
import TransactionList from './TransactionList';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

type Props = {
  ticker: string;
  filings: InsiderFiling[];
  issuerCik?: string;
};

export default function PersonFilingTimeline({ ticker, filings, issuerCik }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(acc: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) next.delete(acc);
      else next.add(acc);
      return next;
    });
  }

  return (
    <section className="insider-timeline">
      <header className="insider-timeline-header">
        <h3 className="insider-timeline-title">{ticker}</h3>
        <Badge variant="outline">{filings.length} filings</Badge>
      </header>
      <ol className="insider-timeline-list">
        {filings.map((f) => {
          const style = getFormStyle(f.form);
          const accNoDashes = f.accession.replace(/-/g, '');
          const href = issuerCik
            ? `${EDGAR_ARCHIVES}/${issuerCik}/${accNoDashes}/${f.accession}-index.html`
            : null;
          const hasTransactions = (f.transactions?.length ?? 0) > 0;
          const isExpanded = expanded.has(f.accession);

          return (
            <li key={f.accession} className="insider-timeline-item">
              {style && (
                <span className="sec-form-tag" style={{ background: style.color }}>
                  {style.label}
                </span>
              )}
              <span className="insider-timeline-date">{f.filingDate}</span>
              {f.reportPeriod && f.reportPeriod !== f.filingDate && (
                <span className="insider-timeline-period">period {f.reportPeriod}</span>
              )}
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="insider-timeline-link">
                  {f.accession} ↗
                </a>
              ) : (
                <span className="insider-timeline-link">{f.accession}</span>
              )}
              <ImpactBadge deltaPct={f.priceImpact?.deltaPct} />
              {hasTransactions && (
                <button
                  className="insider-expand-btn"
                  onClick={() => toggle(f.accession)}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              )}
              {isExpanded && f.transactions && (
                <div className="insider-transaction-wrap">
                  <TransactionList transactions={f.transactions} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
