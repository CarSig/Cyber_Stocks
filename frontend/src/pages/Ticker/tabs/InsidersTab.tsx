import { Link } from 'react-router-dom';
import AggregateCard from '@/features/insiders/components/AggregateCard';
import InsiderRowItem from '@/features/insiders/components/InsiderRowItem';
import { useCompanyInsiders, useCompanyAggregate } from '@/features/insiders/hooks';
import '@/pages/Insiders/Insiders.css';

type Props = { ticker: string };

export default function InsidersTab({ ticker }: Props) {
  const { data = [], isPending, error } = useCompanyInsiders(ticker || null);
  const { data: agg } = useCompanyAggregate(ticker || null);

  return (
    <div>
      {isPending && <p className="insiders-loading">Loading…</p>}
      {error && <p className="insiders-error">{(error as Error).message}</p>}
      <AggregateCard agg={agg} />
      {!isPending && data.length === 0 && (
        <p className="insiders-empty">No insider filings on disk for {ticker}.</p>
      )}
      <div className="insider-row-list">
        {data.map((row) => (
          <InsiderRowItem key={row.personCik} row={row} showCompanies={false} />
        ))}
      </div>
      {data.length > 0 && (
        <Link to={`/insiders/company/${ticker}`} className="insiders-back" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Full page ↗
        </Link>
      )}
    </div>
  );
}
