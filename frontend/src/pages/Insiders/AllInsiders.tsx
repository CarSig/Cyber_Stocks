import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import { Input } from '@/components/ui/input';
import InsiderRowItem from '@/features/insiders/components/InsiderRowItem';
import { useAllInsiders } from '@/features/insiders/hooks';
import './Insiders.css';

export default function AllInsiders() {
  const { data = [], isPending, error } = useAllInsiders();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.toLowerCase();
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.companies.some((c) => c.toLowerCase().includes(q)),
    );
  }, [data, filter]);

  return (
    <Page title="All Insiders">
      <Link to="/insiders" className="insiders-back">← Insiders</Link>
      <div className="insider-filter">
        <Input
          placeholder="Filter by name or ticker…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="insider-filter-count">{filtered.length} of {data.length}</span>
      </div>
      {isPending && <p className="insiders-loading">Loading…</p>}
      {error && <p className="insiders-error">{(error as Error).message}</p>}
      <div className="insider-row-list">
        {filtered.map((row) => (
          <InsiderRowItem key={row.personCik} row={row} showCompanies />
        ))}
      </div>
    </Page>
  );
}
