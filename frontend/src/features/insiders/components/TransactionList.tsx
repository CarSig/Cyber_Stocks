import type { Form4Transaction } from '@algo/shared';

type Props = { transactions: Form4Transaction[] };

const CODE_LABELS: Record<string, string> = {
  P: 'Purchase',
  S: 'Sale',
  A: 'Grant',
  D: 'Disposition',
  F: 'Tax withhold',
  M: 'Option exercise',
  C: 'Conversion',
  E: 'Short deriv. expiry',
  H: 'Long deriv. expiry',
  O: 'OTM option exercise',
  X: 'ITM option exercise',
  G: 'Gift',
  V: 'Voluntary',
  J: 'Other',
  K: 'Equity swap',
  L: 'Small acquisition',
  U: 'Tender disposition',
  W: 'Inheritance',
  Z: 'Voting trust',
  I: 'Discretionary',
};

function fmtNum(n: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function TransactionList({ transactions }: Props) {
  if (!transactions.length) return <p className="insiders-empty">No transactions recorded.</p>;
  return (
    <table className="insider-transaction-list">
      <thead>
        <tr>
          <th>Type</th>
          <th>Security</th>
          <th>Date</th>
          <th>Direction</th>
          <th className="num">Shares</th>
          <th className="num">Price</th>
          <th className="num">Owned after</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => (
          <tr key={i}>
            <td>{CODE_LABELS[t.code] ?? t.code}</td>
            <td>{t.securityTitle || '—'}</td>
            <td>{t.transactionDate ?? '—'}</td>
            <td>{t.acquiredDisposed === 'A' ? 'Acquired' : t.acquiredDisposed === 'D' ? 'Disposed' : '—'}</td>
            <td className="num">{fmtNum(t.shares)}</td>
            <td className="num">
              {t.priceFromFootnote ? <span title="Price from footnote">ftn</span> : fmtNum(t.pricePerShare)}
            </td>
            <td className="num">{fmtNum(t.sharesOwnedAfter)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
