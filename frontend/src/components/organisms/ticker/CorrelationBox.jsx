import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const GROUPED_COLORS = {
  positive: 'var(--color-green)',
  negative: 'var(--color-red)',
  neutral: 'var(--color-amber)',
};

function fmt(pct) {
  return pct != null ? pct.toFixed(2) + '%' : '—';
}

export default function CorrelationBox({
  correlation,
  lagImpact,
  lagImpactLabel,
  lagDays,
  onLagDaysChange,
  isPending,
  isFetching,
  error,
}) {
  const isGrouped = lagImpact && 'positive' in lagImpact;

  return (
    <div className="correlation-body">
      {lagDays !== undefined && onLagDaysChange && (
        <div className="correlation-lag-row">
          <Label className="correlation-lag-label">Lag days</Label>
          <Input
            type="number"
            min="0"
            max="30"
            value={lagDays}
            onChange={(e) => onLagDaysChange(Math.max(0, Math.min(30, Number(e.target.value))))}
            className="correlation-lag-input"
          />
        </div>
      )}

      {isPending && <p>Loading correlation…</p>}
      {error && <p className="ti-muted">{error.message}</p>}

      {correlation?.r != null && !error && (
        <div style={{ opacity: isFetching ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <p className="correlation-desc">{correlation.interpretation}</p>
          <div className="correlation-stats">
            <span title="Pearson r: strength and direction of linear relationship (-1 to +1)">
              Correlation (r): <strong>{correlation.r.toFixed(3)}</strong>
            </span>
            <span title="Probability of seeing this result by chance. Below 0.05 is considered statistically significant.">
              p-value: <strong>{correlation.pValue < 0.001 ? '< 0.001' : correlation.pValue.toFixed(3)}</strong>
            </span>
            {correlation.ci?.[0] != null && (
              <span title="95% confidence interval for r. If this range includes 0, the correlation may not be real.">
                95% CI:{' '}
                <strong>
                  [{correlation.ci[0].toFixed(3)}, {correlation.ci[1].toFixed(3)}]
                </strong>
              </span>
            )}
            <span title="Number of event days used in the calculation">
              Samples: <strong>{correlation.n}</strong>
            </span>
            {correlation.lagDays != null && (
              <span title="Days between the event and the price measurement">
                Lag: <strong>{correlation.lagDays}d</strong>
              </span>
            )}
            <span title="Whether p-value is below 0.05 (statistically significant)">
              Significant: <strong>{correlation.significant ? 'Yes' : 'No'}</strong>
            </span>
          </div>

          {isGrouped && (
            <div className="correlation-stats" style={{ marginTop: 8 }}>
              {['positive', 'negative', 'neutral'].map((key) => (
                <span
                  key={key}
                  title={`Average cumulative price return ${lagImpact.windowDays ?? lagDays} days after events with this sentiment`}
                >
                  +{lagImpact.windowDays ?? lagDays}d after{' '}
                  <strong style={{ color: GROUPED_COLORS[key] }}>{key}</strong>:{' '}
                  <strong>{fmt(lagImpact[key].avgChangePct)}</strong> (n={lagImpact[key].n})
                </span>
              ))}
            </div>
          )}

          {!isGrouped && lagImpact?.avgChangePct != null && (
            <div className="correlation-stats" style={{ marginTop: 8 }}>
              <span
                title={`Average cumulative price return ${lagImpact.windowDays ?? lagDays} calendar days after each event`}
              >
                +{lagImpact.windowDays ?? lagDays}d after <strong>{lagImpactLabel}</strong>:{' '}
                <strong style={{ color: lagImpact.avgChangePct >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {lagImpact.avgChangePct.toFixed(2)}%
                </strong>{' '}
                (n={lagImpact.n})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
