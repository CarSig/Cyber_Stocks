import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import './Admin.css';
import { getAuditLog, triggerJob, runMigrations } from '@/api/admin';
import { Button } from '@/components/ui/button';
import Page from '@/components/common/layout/Page';

const JOBS = ['populate', 'news', 'trump', 'reddit', 'threatintel'] as const;

const PROMETHEUS_URL = 'http://localhost:9090';
const GRAFANA_URL = 'http://localhost:3001';
const ANTHROPIC_CONSOLE_URL = 'https://console.anthropic.com/settings/billing';
const SENTRY_URL = 'https://sentry.io';

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/v1'
    : `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1`;

type AdminCardProps = {
  icon: string;
  label: string;
  subtitle: string;
  to: string;
};

function AdminCard({ icon, label, subtitle, to }: AdminCardProps) {
  const isExternal = to.startsWith('http');
  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className="admin-card admin-card--external">
        <div className="admin-card-icon">{icon}</div>
        <div className="admin-card-label">{label}</div>
        <div className="admin-card-sub">{subtitle}</div>
      </a>
    );
  }
  return (
    <Link to={to} className="admin-card">
      <div className="admin-card-icon">{icon}</div>
      <div className="admin-card-label">{label}</div>
      <div className="admin-card-sub">{subtitle}</div>
    </Link>
  );
}

type JobState = { status: 'running' | 'done' | 'error'; message?: string };

type SyncAllProgress = {
  type: 'ticker_start' | 'filing' | 'ticker_done' | 'done' | 'ping';
  ticker?: string;
  tickerIndex?: number;
  tickerTotal?: number;
  filingCurrent?: number;
  filingTotal?: number;
  form?: string;
};

function EdgarSyncAllJob() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncAllProgress | null>(null);
  const esRef = useRef<EventSource | null>(null);

  function startStream() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const token = localStorage.getItem('auth_token') ?? '';
    const url = `${API_BASE}/admin/edgar-sync-all/progress?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SyncAllProgress;
        if (data.type === 'ping') return;
        setProgress(data);
        if (data.type === 'done') {
          setRunning(false);
          setDone(true);
          es.close();
          esRef.current = null;
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
  }

  useEffect(() => {
    const token = localStorage.getItem('auth_token') ?? '';
    fetch(`${API_BASE}/admin/edgar-sync-all/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: { running: boolean }) => {
        if (data.running) {
          setRunning(true);
          startStream();
        }
      })
      .catch(() => {
        /* ignore — admin page may not be accessible yet */
      });
    return () => {
      esRef.current?.close();
    };
  }, []);

  async function trigger() {
    setError(null);
    setDone(false);
    setProgress(null);
    try {
      await fetch(`${API_BASE}/admin/trigger/edgar-sync-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}` },
      });
      setRunning(true);
      startStream();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    }
  }

  const pct =
    progress?.tickerTotal && progress.tickerIndex != null
      ? Math.round((progress.tickerIndex / progress.tickerTotal) * 100)
      : 0;

  return (
    <div className="admin-job-row admin-job-row--edgar">
      <span className="admin-job-name">edgar-sync-all</span>
      <Button size="sm" variant="outline" disabled={running} onClick={trigger}>
        {running ? 'Running…' : 'Trigger'}
      </Button>
      {done && <span className="admin-job-status admin-job-status--ok">✓ complete</span>}
      {error && <span className="admin-job-status admin-job-status--err">✕ {error}</span>}
      {running && progress && (
        <div className="sec-progress" style={{ flex: 1 }}>
          <div className="sec-progress-bar-wrap">
            <div className="sec-progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <span className="sec-progress-label">
            {progress.type === 'filing' && progress.ticker
              ? `${progress.ticker} (${progress.tickerIndex}/${progress.tickerTotal}) — filing ${progress.filingCurrent ?? '?'}/${progress.filingTotal ?? '?'} ${progress.form ?? ''}`
              : progress.type === 'ticker_done' && progress.ticker
                ? `${progress.ticker} done (${progress.tickerIndex}/${progress.tickerTotal})`
                : progress.type === 'ticker_start' && progress.ticker
                  ? `Starting ${progress.ticker} (${progress.tickerIndex}/${progress.tickerTotal})…`
                  : `${progress.tickerIndex ?? 0}/${progress.tickerTotal ?? '?'} tickers`}
          </span>
        </div>
      )}
      {running && !progress && <span className="sec-progress-label">Initializing…</span>}
    </div>
  );
}

function MigrationsButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function trigger() {
    setStatus('running');
    setMessage('');
    try {
      const res = await runMigrations();
      setStatus('done');
      setMessage(`done at ${new Date(res.at).toLocaleTimeString()}`);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <div className="admin-jobs">
      <h2 className="admin-jobs-title">Database</h2>
      <div className="admin-jobs-list">
        <div className="admin-job-row">
          <span className="admin-job-name">run-migrations</span>
          <Button size="sm" variant="outline" disabled={status === 'running'} onClick={trigger}>
            {status === 'running' ? 'Running…' : 'Run'}
          </Button>
          {status === 'done' && <span className="admin-job-status admin-job-status--ok">✓ {message}</span>}
          {status === 'error' && <span className="admin-job-status admin-job-status--err">✕ {message}</span>}
        </div>
      </div>
    </div>
  );
}

function EdgarBackfillCoverageButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function trigger() {
    setStatus('running');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/trigger/edgar-backfill-coverage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}` },
      });
      const data = (await res.json()) as { updated: number; at: string };
      setStatus('done');
      setMessage(`${data.updated} tickers updated`);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <div className="admin-job-row">
      <span className="admin-job-name">edgar-backfill-coverage</span>
      <Button size="sm" variant="outline" disabled={status === 'running'} onClick={trigger}>
        {status === 'running' ? 'Running…' : 'Trigger'}
      </Button>
      {status === 'done' && <span className="admin-job-status admin-job-status--ok">✓ {message}</span>}
      {status === 'error' && <span className="admin-job-status admin-job-status--err">✕ {message}</span>}
    </div>
  );
}

function StockHistoryBackfillButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [fromDate, setFromDate] = useState('2019-01-01');

  async function trigger() {
    setStatus('running');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/trigger/stock-backfill-history?from=${encodeURIComponent(fromDate)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}` },
      });
      const data = (await res.json()) as { started: boolean; fromDate: string; at: string };
      // Bust stale stock quote cache so the next page load fetches fresh data
      Object.keys(localStorage)
        .filter((k) => k.includes('ticker_'))
        .forEach((k) => localStorage.removeItem(k));
      setStatus('done');
      setMessage(`started from ${data.fromDate} — cache cleared, running in background`);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <div className="admin-job-row">
      <span className="admin-job-name">stock-backfill-history</span>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        disabled={status === 'running'}
        style={{
          fontSize: 12,
          padding: '2px 6px',
          borderRadius: 4,
          border: '1px solid #444',
          background: 'transparent',
          color: 'inherit',
        }}
      />
      <Button size="sm" variant="outline" disabled={status === 'running'} onClick={trigger}>
        {status === 'running' ? 'Running…' : 'Backfill'}
      </Button>
      {status === 'done' && <span className="admin-job-status admin-job-status--ok">✓ {message}</span>}
      {status === 'error' && <span className="admin-job-status admin-job-status--err">✕ {message}</span>}
    </div>
  );
}

function JobTriggers() {
  const [states, setStates] = useState<Record<string, JobState>>({});

  async function trigger(job: string) {
    setStates((s) => ({ ...s, [job]: { status: 'running' } }));
    try {
      const res = (await triggerJob(job)) as { triggered: string; at: string };
      setStates((s) => ({
        ...s,
        [job]: { status: 'done', message: `triggered at ${new Date(res.at).toLocaleTimeString()}` },
      }));
    } catch (e) {
      setStates((s) => ({
        ...s,
        [job]: { status: 'error', message: e instanceof Error ? e.message : 'Unknown error' },
      }));
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
              <Button size="sm" variant="outline" disabled={state?.status === 'running'} onClick={() => trigger(job)}>
                {state?.status === 'running' ? 'Running…' : 'Trigger'}
              </Button>
              {state?.status === 'done' && (
                <span className="admin-job-status admin-job-status--ok">✓ {state.message}</span>
              )}
              {state?.status === 'error' && (
                <span className="admin-job-status admin-job-status--err">✕ {state.message}</span>
              )}
            </div>
          );
        })}
        <EdgarSyncAllJob />
        <EdgarBackfillCoverageButton />
        <StockHistoryBackfillButton />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: audit } = useQuery<{ total: number }>({
    queryKey: ['audit', 0, ''],
    queryFn: () => getAuditLog({ limit: 1 }),
  });

  return (
    <Page title="Admin">
      <div className="admin-dash-grid">
        <AdminCard
          icon="📋"
          label="Audit Log"
          subtitle={audit ? `${audit.total} entries` : 'User activity'}
          to="/admin/audit"
        />
        <AdminCard icon="💬" label="DOM Feedback" subtitle="Element inspect reports" to="/admin/feedback" />
        <AdminCard icon="🔬" label="Research & Strategy" subtitle="EDGAR, contracts, spending" to="/research" />
        <AdminCard icon="🗺️" label="App Map" subtitle="Page graph & data flows" to="/graph" />
        <AdminCard icon="🤖" label="AI Credits" subtitle="console.anthropic.com ↗" to={ANTHROPIC_CONSOLE_URL} />
        <AdminCard icon="📊" label="Prometheus" subtitle="localhost:9090 ↗" to={PROMETHEUS_URL} />
        <AdminCard icon="📈" label="Grafana" subtitle="localhost:3001 ↗" to={GRAFANA_URL} />
        <AdminCard icon="🐛" label="Sentry" subtitle="sentry.io ↗" to={SENTRY_URL} />
      </div>

      <MigrationsButton />
      <JobTriggers />
    </Page>
  );
}
