import { Link, useParams } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import PersonFilingTimeline from '@/features/insiders/components/PersonFilingTimeline';
import AggregateCard from '@/features/insiders/components/AggregateCard';
import { usePerson, usePersonAggregate } from '@/features/insiders/hooks';
import type { InsiderOwnerProfile } from '@algo/shared';
import './Insiders.css';

function roleLabel(r: InsiderOwnerProfile): string {
  if (r.isOfficer && r.officerTitle) return r.officerTitle;
  if (r.isOfficer) return 'Officer';
  if (r.isDirector) return 'Director';
  if (r.isTenPercentOwner) return '10%+ Owner';
  return 'Other';
}

function edgarUrl(cik: string): string {
  const padded = cik.padStart(10, '0');
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padded}&type=4&dateb=&owner=include&count=40`;
}

export default function PersonPage() {
  const { personCik } = useParams<{ personCik: string }>();
  const { data, isPending, error } = usePerson(personCik ?? null);
  const { data: agg } = usePersonAggregate(personCik ?? null);

  const orderedTickers = data
    ? Object.entries(data.filingsByCompany)
        .sort((a, b) => {
          const aLatest = a[1][0]?.filingDate ?? '';
          const bLatest = b[1][0]?.filingDate ?? '';
          return bLatest > aLatest ? 1 : -1;
        })
        .map(([t]) => t)
    : [];

  return (
    <Page title={data?.name ?? 'Insider'}>
      <Link to="/insiders/all" className="insiders-back">
        ← All Insiders
      </Link>
      {isPending && <p className="insiders-loading">Loading…</p>}
      {error && <p className="insiders-error">{(error as Error).message}</p>}
      {data && (
        <>
          <header className="insider-person-header">
            <h1 className="insider-person-name">{data.name}</h1>
            <span className="insider-person-cik">CIK {data.personCik}</span>
            <span className="insider-person-companies">
              {orderedTickers.length} compan{orderedTickers.length === 1 ? 'y' : 'ies'}
            </span>
            {data.roles.length > 0 && (
              <div className="insider-person-roles">
                {data.roles.map((r, i) => (
                  <span key={i} className="insider-role-badge">
                    {roleLabel(r)}
                  </span>
                ))}
              </div>
            )}
            <a href={edgarUrl(data.personCik)} target="_blank" rel="noreferrer" className="insider-edgar-link">
              SEC EDGAR profile ↗
            </a>
          </header>
          <AggregateCard agg={agg} />
          <div className="insider-timelines">
            {orderedTickers.map((t) => {
              const filings = data.filingsByCompany[t];
              const issuerCik = filings[0]?.issuerCik;
              return <PersonFilingTimeline key={t} ticker={t} filings={filings} issuerCik={issuerCik} />;
            })}
          </div>
        </>
      )}
    </Page>
  );
}
