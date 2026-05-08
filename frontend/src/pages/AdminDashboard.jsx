import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAuditLog } from "../api.js";

const PROMETHEUS_URL = "http://localhost:9090";
const GRAFANA_URL = "http://localhost:3001";
const ANTHROPIC_CONSOLE_URL = "https://console.anthropic.com/settings/billing";

export default function AdminDashboard() {
  const { data: audit } = useQuery({ queryKey: ["audit", 0, ""], queryFn: () => getAuditLog({ limit: 1 }) });

  return (
    <div className="admin-dash">
      <h1 className="admin-dash-title">Admin</h1>

      <div className="admin-dash-grid">
        <Link to="/admin/audit" className="admin-card">
          <div className="admin-card-icon">📋</div>
          <div className="admin-card-label">Audit Log</div>
          <div className="admin-card-sub">{audit ? `${audit.total} entries` : "User activity"}</div>
        </Link>

        <a href={ANTHROPIC_CONSOLE_URL} target="_blank" rel="noreferrer" className="admin-card admin-card--external">
          <div className="admin-card-icon">🤖</div>
          <div className="admin-card-label">AI Credits</div>
          <div className="admin-card-sub">console.anthropic.com ↗</div>
        </a>

        <a href={PROMETHEUS_URL} target="_blank" rel="noreferrer" className="admin-card admin-card--external">
          <div className="admin-card-icon">📊</div>
          <div className="admin-card-label">Prometheus</div>
          <div className="admin-card-sub">localhost:9090 ↗</div>
        </a>

        <a href={GRAFANA_URL} target="_blank" rel="noreferrer" className="admin-card admin-card--external">
          <div className="admin-card-icon">📈</div>
          <div className="admin-card-label">Grafana</div>
          <div className="admin-card-sub">localhost:3001 ↗</div>
        </a>
      </div>
    </div>
  );
}
