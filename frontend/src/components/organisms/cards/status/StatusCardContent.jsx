import Stat from '@/components/atoms/Stat.jsx';

export default function StatusCardContent({ data, type }) {
  if (!data) return <p className="ti-empty">No data — sync pending</p>;

  if (type === 'kev') {
    return (
      <div className="ti-stats-row">
        <Stat label="Total" value={data.count} />
        <Stat label="Last 30d" value={data.recentCount} color="var(--accent)" />
        <Stat label="Ransomware" value={data.ransomwareCount} color="var(--color-red)" />
      </div>
    );
  }

  if (type === 'nvd') {
    return (
      <div className="ti-stats-row">
        <Stat label="Fetched" value={data.fetched} />
        <Stat label="Critical" value={data.criticalCount} color="var(--color-red)" />
        <Stat label="High" value={data.highCount} color="var(--color-amber)" />
      </div>
    );
  }

  if (type === 'otx') {
    return data.configured ? (
      <div className="ti-stats-row">
        <Stat label="Pulses" value={data.count} />
      </div>
    ) : (
      <p className="ti-empty">
        Set <code>OTX_API_KEY</code> in backend/.env
      </p>
    );
  }

  if (type === 'misp') {
    return data.configured ? (
      <div className="ti-stats-row">
        <Stat label="Events" value={data.count} />
      </div>
    ) : (
      <p className="ti-empty">
        Set <code>MISP_URL</code> + <code>MISP_API_KEY</code> in backend/.env
      </p>
    );
  }

  return null;
}
