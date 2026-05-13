import { Link } from "react-router-dom";

function SyncedAt({ iso }) {
  if (!iso) return null;
  return <span className="ti-synced">Synced {new Date(iso).toLocaleString()}</span>;
}

export default function StatusCard({ to, icon, title, configured = true, children, syncedAt }) {
  const inner = (
    <>
      <div className="ti-card-head">
        <span className="ti-card-icon">{icon}</span>
        <span className="ti-card-title">{title}</span>
        {!configured && <span className="ti-badge ti-badge--warn">Not configured</span>}
      </div>
      <div className="ti-card-body">{children}</div>
      <SyncedAt iso={syncedAt} />
    </>
  );
  return to
    ? <Link to={to} className="ti-card">{inner}</Link>
    : <div className="ti-card ti-card--disabled">{inner}</div>;
}
