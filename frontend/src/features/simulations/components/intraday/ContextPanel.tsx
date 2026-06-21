import { useQuery } from '@tanstack/react-query';
import BaseCard from '@/components/common/cards/BaseCard';
import { getSimContext } from '@/features/charts/api';
import { pairEvents, accuracy } from '../../utils/contextCompare';
import type { Pair } from '../../utils/contextCompare';
import type { LayerData, SimContext } from '@algo/shared';

function gradeColor(active: boolean, grade: number): string | undefined {
  if (!active) return undefined;
  if (grade >= 9) return '#ef4444';
  if (grade >= 7) return '#f59e0b';
  return '#22c55e';
}

/** 1–10 grade bar — mirrors the severity bar used by IntradayEventCard. */
function GradeBar({ grade }: { grade: number }) {
  return (
    <div className="severity-bar">
      {Array.from({ length: 10 }).map((_, i) => {
        const active = i < grade;
        const color = gradeColor(active, grade);
        return <div key={i} className="severity-bar-cell" style={color ? { background: color } : undefined} />;
      })}
      <span className="severity-bar-readout">{grade}/10</span>
    </div>
  );
}

function SnapshotCard({ layer }: { layer: LayerData }) {
  return (
    <div className="ctx-snapshot">
      <span className="ctx-snapshot-layer">{layer.layer}</span>
      <span className="ctx-snapshot-key">{layer.key}</span>
      <p className="ctx-snapshot-current">{layer.current}</p>
    </div>
  );
}

function PairRow({ pair }: { pair: Pair }) {
  const { actual, predicted } = pair;
  const delta = actual && predicted ? actual.grade - predicted.grade : null;
  const status = !predicted ? 'extra' : !actual ? 'missed' : 'matched';
  return (
    <div className={`ctx-pair ctx-pair--${status}`}>
      <span className="ctx-pair-date">{pair.date}</span>
      <span className="ctx-pair-category">{pair.category}</span>
      <div className="ctx-pair-side">
        {actual ? <GradeBar grade={actual.grade} /> : <span className="ctx-pair-empty">— not predicted? —</span>}
        {actual && <p className="ctx-pair-desc">{actual.description}</p>}
      </div>
      <div className="ctx-pair-side">
        {predicted ? <GradeBar grade={predicted.grade} /> : <span className="ctx-pair-empty">— no prediction —</span>}
        {predicted && <p className="ctx-pair-desc">{predicted.description}</p>}
      </div>
      <span className="ctx-pair-delta">
        {delta === null
          ? status === 'missed'
            ? 'miss'
            : 'extra'
          : delta === 0
            ? '✓'
            : `Δ${delta > 0 ? '+' : ''}${delta}`}
      </span>
    </div>
  );
}

function ComparisonView({ ctx }: { ctx: SimContext }) {
  const pairs = pairEvents(ctx.company.events, ctx.prediction.events);
  const acc = accuracy(pairs);
  return (
    <div className="ctx-compare">
      <div className="ctx-compare-summary">
        <span>
          <strong>{acc.matched}</strong> matched
        </span>
        <span>
          <strong>{acc.missed}</strong> predicted-only
        </span>
        <span>
          <strong>{acc.extra}</strong> unpredicted
        </span>
        <span>
          mean |Δ grade|: <strong>{acc.meanAbsDelta === null ? '—' : acc.meanAbsDelta.toFixed(1)}</strong>
        </span>
      </div>
      <div className="ctx-compare-head">
        <span className="ctx-pair-date">Date</span>
        <span className="ctx-pair-category">Category</span>
        <span className="ctx-compare-col">Actual</span>
        <span className="ctx-compare-col">Predicted</span>
        <span className="ctx-pair-delta">Δ</span>
      </div>
      {pairs.length === 0 ? (
        <p className="ctx-empty">No company or prediction events to compare.</p>
      ) : (
        pairs.map((p) => <PairRow key={`${p.date}-${p.category}-${p.actual ? 'a' : 'p'}`} pair={p} />)
      )}
    </div>
  );
}

type Props = { ticker: string };

export default function ContextPanel({ ticker }: Props) {
  const {
    data: ctx,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sim-context', ticker],
    queryFn: () => getSimContext(ticker),
    enabled: !!ticker,
    staleTime: Infinity,
  });

  if (!ticker) return null;

  return (
    <BaseCard variant="article">
      <div className="ctx-header">
        <span className="ctx-header-title">Context & Predictions</span>
        <span className="ctx-header-ticker">{ticker}</span>
      </div>

      {isLoading && <p className="ctx-empty">Loading context…</p>}
      {error && <p className="ctx-empty ctx-error">{(error as Error).message}</p>}

      {ctx && (
        <>
          <div className="ctx-snapshots">
            <SnapshotCard layer={ctx.market} />
            <SnapshotCard layer={ctx.industry} />
            <SnapshotCard layer={ctx.company} />
          </div>

          <div className="ctx-section-label">Actual vs Predicted</div>
          <ComparisonView ctx={ctx} />
        </>
      )}
    </BaseCard>
  );
}
