import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { InsiderRow } from '@algo/shared';

type Props = {
  row: InsiderRow;
  showCompanies?: boolean;
};

export default function InsiderRowItem({ row, showCompanies = true }: Props) {
  return (
    <Link to={`/insiders/person/${row.personCik}`} className="insider-row">
      <div className="insider-row-main">
        <span className="insider-row-name">{row.name}</span>
        <span className="insider-row-cik">CIK {row.personCik}</span>
      </div>
      {showCompanies && (
        <div className="insider-row-companies">
          {row.companies.map((t) => (
            <Badge key={t} variant="outline" className="insider-company-badge">
              {t}
            </Badge>
          ))}
        </div>
      )}
      <div className="insider-row-meta">
        <span className="insider-row-count">{row.filingCount} filings</span>
        <span className="insider-row-date">{row.latestFilingDate}</span>
      </div>
    </Link>
  );
}
