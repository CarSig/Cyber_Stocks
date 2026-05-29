import { useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import { Badge } from '@/components/ui/badge';
import ImpactBadge from '@/features/insiders/components/ImpactBadge';
import { useLeaderboard } from '@/features/insiders/hooks';
import type { InsiderImpactAggregate, InsiderLeaderboardRow } from '@algo/shared';
import './Insiders.css';

const CODE_LABELS: Record<string, string> = {
  P: 'Purchase',
  S: 'Sale',
  A: 'Grant',
  D: 'Disposition',
  F: 'Tax withhold',
  M: 'Option exercise',
  C: 'Conversion',
  G: 'Gift',
  V: 'Voluntary',
  J: 'Other',
  K: 'Equity swap',
  L: 'Small acq.',
  U: 'Tender disp.',
  W: 'Inheritance',
  Z: 'Voting trust',
  I: 'Discretionary',
  E: 'Short deriv. expiry',
  H: 'Long deriv. expiry',
  O: 'OTM exercise',
  X: 'ITM exercise',
};

type SortKey = 'overall' | 'buy' | 'sell' | 'filings' | string;

function getVal(agg: InsiderImpactAggregate, key: SortKey): number | null {
  if (key === 'overall') return agg.overall.avgDeltaPct;
  if (key === 'buy') return agg.buy.avgDeltaPct;
  if (key === 'sell') return agg.sell.avgDeltaPct;
  if (key === 'filings') return null;
  return agg.byCode[key]?.avgDeltaPct ?? null;
}

function sortRows(rows: InsiderLeaderboardRow[], key: SortKey): InsiderLeaderboardRow[] {
  return [...rows].sort((a, b) => {
    if (key === 'filings') return b.filingCount - a.filingCount;
    const av = getVal(a.aggregate, key);
    const bv = getVal(b.aggregate, key);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return key === 'overall' ? Math.abs(bv) - Math.abs(av) : bv - av;
  });
}

function OtherCell({ agg, topCodes }: { agg: InsiderImpactAggregate; topCodes: string[] }) {
  // aggregate all codes not in P, S, or topCodes
  const shown = new Set(['P', 'S', ...topCodes]);
  const deltas: number[] = [];
  for (const [code, bucket] of Object.entries(agg.byCode)) {
    if (!shown.has(code) && bucket.avgDeltaPct != null) {
      // weight by count
      for (let i = 0; i < bucket.count; i++) deltas.push(bucket.avgDeltaPct);
    }
  }
  const avg = deltas.length === 0 ? null : deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return (
    <td className="num">
      <ImpactBadge deltaPct={avg} />
      {avg == null && <span className="insider-agg-no-data">—</span>}
    </td>
  );
}

type ThProps = { label: string; sortKey: SortKey; current: SortKey; onClick: (k: SortKey) => void };
function Th({ label, sortKey, current, onClick }: ThProps) {
  return (
    <th
      className={`insider-lb-th${current === sortKey ? ' active' : ''}`}
      onClick={() => onClick(sortKey)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      {label}
      {current === sortKey ? ' ▼' : ''}
    </th>
  );
}

export default function Leaderboard() {
  const { data, isPending, error } = useLeaderboard();
  const [sortKey, setSortKey] = useState<SortKey>('overall');

  const rows = data?.rows ?? [];
  const topCodes = data?.topCodes ?? [];
  const sorted = sortRows(rows, sortKey);

  return (
    <Page title="Insider Impact Leaderboard">
      <Link to="/insiders" className="insiders-back">
        ← Insiders
      </Link>
      <p className="insiders-blurb">
        Insiders ranked by same-day price delta (filing date open → close). Buy = open-market purchase (P); Sell =
        open-market sale (S). Other columns are the top transaction types by frequency.
      </p>
      {isPending && <p className="insiders-loading">Loading…</p>}
      {error && <p className="insiders-error">{(error as Error).message}</p>}
      {!isPending && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="insider-leaderboard-table">
            <thead>
              <tr>
                <th className="insider-lb-th">#</th>
                <th className="insider-lb-th">Name</th>
                <th className="insider-lb-th">Companies</th>
                <Th label="Filings" sortKey="filings" current={sortKey} onClick={setSortKey} />
                <Th label="Buy avg Δ" sortKey="buy" current={sortKey} onClick={setSortKey} />
                <Th label="Sell avg Δ" sortKey="sell" current={sortKey} onClick={setSortKey} />
                {topCodes.map((code) => (
                  <Th
                    key={code}
                    label={`${CODE_LABELS[code] ?? code} Δ`}
                    sortKey={code}
                    current={sortKey}
                    onClick={setSortKey}
                  />
                ))}
                <th className="insider-lb-th">Other Δ</th>
                <Th label="Overall |Δ|" sortKey="overall" current={sortKey} onClick={setSortKey} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row.personCik} className="insider-lb-row">
                  <td className="insider-lb-rank">{i + 1}</td>
                  <td>
                    <Link to={`/insiders/person/${row.personCik}`} className="insider-lb-name">
                      {row.name}
                    </Link>
                    <div className="insider-lb-cik">{row.personCik}</div>
                  </td>
                  <td>
                    <div className="insider-row-companies">
                      {row.companies.map((t) => (
                        <Badge key={t} variant="outline" className="insider-company-badge">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="num">{row.filingCount}</td>
                  <td className="num">
                    <ImpactBadge deltaPct={row.aggregate.buy.avgDeltaPct} />
                    {row.aggregate.buy.avgDeltaPct == null && <span className="insider-agg-no-data">—</span>}
                  </td>
                  <td className="num">
                    <ImpactBadge deltaPct={row.aggregate.sell.avgDeltaPct} />
                    {row.aggregate.sell.avgDeltaPct == null && <span className="insider-agg-no-data">—</span>}
                  </td>
                  {topCodes.map((code) => (
                    <td key={code} className="num">
                      <ImpactBadge deltaPct={row.aggregate.byCode[code]?.avgDeltaPct} />
                      {row.aggregate.byCode[code]?.avgDeltaPct == null && (
                        <span className="insider-agg-no-data">—</span>
                      )}
                    </td>
                  ))}
                  <OtherCell agg={row.aggregate} topCodes={topCodes} />
                  <td className="num">
                    <ImpactBadge deltaPct={row.aggregate.overall.avgDeltaPct} />
                    {row.aggregate.overall.avgDeltaPct == null && <span className="insider-agg-no-data">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
