function fmtVal(v: number) {
  return `$${v.toFixed(2)}`;
}

export type BaseTransaction = {
  side?: string;
  type?: string;
  price: number;
  shares: number;
  value: number;
  sharesAfter: number;
  portfolioValue: number;
};

export type LongTermTransaction = BaseTransaction & { date: string; time?: never };
export type DayTradeTransaction = BaseTransaction & { time: string; date?: never };
export type AnyTransaction = LongTermTransaction | DayTradeTransaction;

type SimTransactionTableProps = {
  transactions: AnyTransaction[];
};

export default function SimTransactionTable({ transactions }: SimTransactionTableProps) {
  if (!transactions.length) return null;
  const hasTime = 'time' in transactions[0] && transactions[0].time != null;

  return (
    <table className="sim-table">
      <thead>
        <tr>
          <th>{hasTime ? 'Time (ET)' : 'Date'}</th>
          <th>Action</th>
          <th>Price</th>
          <th>Shares</th>
          <th>Value</th>
          <th>Shares after</th>
          <th>Portfolio</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => {
          const side = (t.side ?? t.type) as string;
          const label = hasTime ? (t as DayTradeTransaction).time : (t as LongTermTransaction).date;
          return (
            <tr key={i}>
              <td>{label}</td>
              <td className={side === 'buy' ? 'sim-buy' : 'sim-sell'}>{side.toUpperCase()}</td>
              <td>{fmtVal(t.price)}</td>
              <td>{t.shares.toFixed(4)}</td>
              <td>{fmtVal(t.value)}</td>
              <td>{t.sharesAfter.toFixed(4)}</td>
              <td>{fmtVal(t.portfolioValue)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
