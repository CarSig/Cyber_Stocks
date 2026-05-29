import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import { useInsiderCompanies } from '@/features/insiders/hooks';
import './Insiders.css';

export default function CompaniesList() {
  const { data = [], isPending, error } = useInsiderCompanies();

  return (
    <Page title="Insiders — Companies">
      <Link to="/insiders" className="insiders-back">← Insiders</Link>
      {isPending && <p className="insiders-loading">Loading…</p>}
      {error && <p className="insiders-error">{(error as Error).message}</p>}
      {!isPending && data.length === 0 && (
        <p className="insiders-empty">No insider filings on disk yet. Run an EDGAR sync first.</p>
      )}
      <div className="insider-companies-grid">
        {data.map((c) => (
          <Link to={`/insiders/company/${c.ticker}`} key={c.ticker} className="insider-company-card">
            <div className="insider-company-ticker">{c.ticker}</div>
            <div className="insider-company-stats">
              <span>{c.insiderCount} insiders</span>
              <span className="insider-company-date">latest {c.latestFilingDate}</span>
            </div>
          </Link>
        ))}
      </div>
    </Page>
  );
}
