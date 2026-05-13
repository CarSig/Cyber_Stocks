import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getThreatIntelStatus } from "../api.js";

function SyncedAt({ iso }) {
  if (!iso) return null;
  return <span className="ti-synced">Synced {new Date(iso).toLocaleString()}</span>;
}

function StatusCard({ to, icon, title, configured = true, children, syncedAt }) {
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

function Stat({ label, value, color }) {
  return (
    <div className="ti-stat">
      <div className="ti-stat-value" style={color ? { color } : {}}>{value ?? "—"}</div>
      <div className="ti-stat-label">{label}</div>
    </div>
  );
}

export default function ThreatIntel() {
  const { data, isPending, error } = useQuery({
    queryKey: ["threat-intel-status"],
    queryFn: getThreatIntelStatus,
    refetchInterval: 60_000,
  });

  if (isPending) return <div className="ti-page"><p className="ti-loading">Loading…</p></div>;
  if (error) return <div className="ti-page"><p className="ti-error">{error.message}</p></div>;

  const { kev, nvd, otx, misp } = data;

  return (
    <div className="ti-page">
      <h1 className="ti-page-title">Threat Intelligence</h1>
      <div className="ti-grid">

        <StatusCard to={kev ? "/threat-intel/list/kev" : null} icon="🛡️" title="CISA KEV" syncedAt={kev?.syncedAt}>
          {kev ? (
            <div className="ti-stats-row">
              <Stat label="Total" value={kev.count} />
              <Stat label="Last 30d" value={kev.recentCount} color="var(--accent)" />
              <Stat label="Ransomware" value={kev.ransomwareCount} color="var(--color-red)" />
            </div>
          ) : <p className="ti-empty">No data — sync pending</p>}
        </StatusCard>

        <StatusCard to={nvd ? "/threat-intel/list/nvd" : null} icon="🔍" title="NVD / NIST" syncedAt={nvd?.syncedAt}>
          {nvd ? (
            <div className="ti-stats-row">
              <Stat label="Fetched" value={nvd.fetched} />
              <Stat label="Critical" value={nvd.criticalCount} color="var(--color-red)" />
              <Stat label="High" value={nvd.highCount} color="var(--color-amber)" />
            </div>
          ) : <p className="ti-empty">No data — sync pending</p>}
        </StatusCard>

        <StatusCard
          to={otx.configured ? "/threat-intel/list/otx" : null}
          icon="👽"
          title="AlienVault OTX"
          configured={otx.configured}
          syncedAt={otx.syncedAt}
        >
          {otx.configured ? (
            <div className="ti-stats-row">
              <Stat label="Pulses" value={otx.count} />
            </div>
          ) : (
            <p className="ti-empty">Set <code>OTX_API_KEY</code> in backend/.env</p>
          )}
        </StatusCard>

        <StatusCard
          to={misp.configured ? "/threat-intel/list/misp" : null}
          icon="🦠"
          title="MISP"
          configured={misp.configured}
          syncedAt={misp.syncedAt}
        >
          {misp.configured ? (
            <div className="ti-stats-row">
              <Stat label="Events" value={misp.count} />
            </div>
          ) : (
            <p className="ti-empty">Set <code>MISP_URL</code> + <code>MISP_API_KEY</code> in backend/.env</p>
          )}
        </StatusCard>

      </div>
    </div>
  );
}
