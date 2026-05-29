import { Link, useParams } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import InsiderRowItem from '@/features/insiders/components/InsiderRowItem';
import AggregateCard from '@/features/insiders/components/AggregateCard';
import { useCompanyInsiders, useCompanyAggregate } from '@/features/insiders/hooks';
import './Insiders.css';

export default function CompanyInsiders() {
  const { ticker } = useParams<{ ticker: string }>();
  const upper = (ticker ?? '').toUpperCase();
  const { data = [], isPending, error } = useCompanyInsiders(upper || null);
  const { data: agg } = useCompanyAggregate(upper || null);

  return (
    <Page title={`Insiders — ${upper}`}>
      <Link to="/insiders/companies" className="insiders-back">← Companies</Link>
      {isPending && <p className="insiders-loading">Loading…</p>}
      {error && <p className="insiders-error">{(error as Error).message}</p>}
      <AggregateCard agg={agg} />
      {!isPending && data.length === 0 && (
        <p className="insiders-empty">No insiders on disk for {upper}.</p>
      )}
      <div className="insider-row-list">
        {data.map((row) => (
          <InsiderRowItem key={row.personCik} row={row} showCompanies={false} />
        ))}
      </div>
    </Page>
  );
}
