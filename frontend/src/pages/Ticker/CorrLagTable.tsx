import { useMemo } from 'react';
import { pearsonLag, corrColor, LAG_COLS } from '@/features/correlations/utils';

type SparklineEntry = {
  closes252?: number[];
};

type CorrLagTableProps = {
  ticker: string;
  sparklinesData?: Record<string, SparklineEntry>;
  companies?: Record<string, string>;
};

export default function CorrLagTable({ ticker, sparklinesData, companies }: CorrLagTableProps) {
  const rows = useMemo(() => {
    if (!sparklinesData || !companies) return [];
    const base = sparklinesData[ticker]?.closes252;
    if (!base?.length) return [];
    return Object.entries(companies)
      .filter(([, t]) => t !== ticker)
      .map(([name, t]) => {
        const other = sparklinesData[t]?.closes252;
        if (!other?.length) return null;
        const cols = LAG_COLS.map((lag) => pearsonLag(base, other, lag));
        return { ticker: t, name, cols };
      })
      .filter((x): x is { ticker: string; name: string; cols: (number | null)[] } => x !== null);
  }, [ticker, sparklinesData, companies]);

  if (!rows.length) return null;

  return (
    <div className="corr-lag-table-wrap">
      <table className="corr-lag-table">
        <thead>
          <tr>
            <th className="clt-th clt-ticker">Ticker</th>
            <th className="clt-th clt-name">Company</th>
            {LAG_COLS.map((d) => (
              <th key={d} className="clt-th clt-val">
                +{d}d
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ticker: t, name, cols }) => (
            <tr key={t} className="clt-row">
              <td className="clt-td clt-ticker">{t}</td>
              <td className="clt-td clt-name">{name}</td>
              {cols.map((v, i) => {
                const bg = v == null ? 'transparent' : corrColor(v);
                const fg = v == null ? 'var(--text-faint)' : 'white';
                return (
                  <td key={i} className="clt-td clt-val" style={{ background: bg, color: fg }}>
                    {v != null ? v.toFixed(2) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="corr-lag-note">
        Each column shows Pearson r of log-returns with base ticker leading by N trading days
      </div>
    </div>
  );
}
