import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAuditLog, triggerJob } from '@/api/admin.js';
import { Button } from '@/components/ui/button.jsx';
import Page from '@/components/atoms/Page.jsx';

const JOBS = ['populate', 'news', 'trump', 'reddit', 'threatintel'];

const PROMETHEUS_URL = 'http://localhost:9090';
const GRAFANA_URL = 'http://localhost:3001';
const ANTHROPIC_CONSOLE_URL = 'https://console.anthropic.com/settings/billing';

function AdminCard({ icon, label, subtitle, to }) {
  const isExternal = to.startsWith('http');
  const Component = isExternal ? 'a' : Link;
  const props = isExternal
    ? { href: to, target: '_blank', rel: 'noreferrer', className: 'admin-card admin-card--external' }
    : { to, className: 'admin-card' };

  return (
    <Component {...props}>
      <div className="admin-card-icon">{icon}</div>
      <div className="admin-card-label">{label}</div>
      <div className="admin-card-sub">{subtitle}</div>
    </Component>
  );
}

function JobTriggers() {
  const [states, setStates] = useState({});

  async function trigger(job) {
    setStates((s) => ({ ...s, [job]: 'running' }));
    try {
      await triggerJob(job);
      setStates((s) => ({ ...s, [job]: 'done' }));
    } catch (e) {
      setStates((s) => ({ ...s, [job]: 'error' }));
    }
  }

  return (
    <div className="admin-jobs">
      <h2 className="admin-jobs-title">Jobs</h2>
      <div className="admin-jobs-list">
        {JOBS.map((job) => {
          const state = states[job];
          return (
            <div key={job} className="admin-job-row">
              <span className="admin-job-name">{job}</span>
              <Button size="sm" variant="outline" disabled={state === 'running'} onClick={() => trigger(job)}>
                {state === 'running' ? 'Running…' : 'Trigger'}
              </Button>
              {state === 'done' && <span className="admin-job-status admin-job-status--ok">✓ triggered</span>}
              {state === 'error' && <span className="admin-job-status admin-job-status--err">✕ failed</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: audit } = useQuery({ queryKey: ['audit', 0, ''], queryFn: () => getAuditLog({ limit: 1 }) });

  return (
    <Page title="Admin">
      <div className="admin-dash-grid">
        <AdminCard
          icon="📋"
          label="Audit Log"
          subtitle={audit ? `${audit.total} entries` : 'User activity'}
          to="/admin/audit"
        />
        <AdminCard icon="🤖" label="AI Credits" subtitle="console.anthropic.com ↗" to={ANTHROPIC_CONSOLE_URL} />
        <AdminCard icon="📊" label="Prometheus" subtitle="localhost:9090 ↗" to={PROMETHEUS_URL} />
        <AdminCard icon="📈" label="Grafana" subtitle="localhost:3001 ↗" to={GRAFANA_URL} />
      </div>

      <JobTriggers />
    </Page>
  );
}
