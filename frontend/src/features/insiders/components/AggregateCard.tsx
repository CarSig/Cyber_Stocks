import type { InsiderImpactAggregate } from '@algo/shared';
import ImpactBadge from './ImpactBadge';

type Props = { agg: InsiderImpactAggregate | undefined };

type Bucket = { label: string; count: number; avgDeltaPct: number | null };

function BucketCell({ label, count, avgDeltaPct }: Bucket) {
  return (
    <div className="insider-agg-bucket">
      <span className="insider-agg-bucket-label">{label}</span>
      <ImpactBadge deltaPct={avgDeltaPct} />
      {avgDeltaPct == null && <span className="insider-agg-no-data">—</span>}
      <span className="insider-agg-bucket-count">{count} filing{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

export default function AggregateCard({ agg }: Props) {
  if (!agg) return null;
  return (
    <div className="insider-aggregate-card">
      <div className="insider-agg-overall">
        <span className="insider-agg-overall-label">Overall avg same-day delta</span>
        <ImpactBadge deltaPct={agg.overall.avgDeltaPct} />
        {agg.overall.avgDeltaPct == null && <span className="insider-agg-no-data">—</span>}
        <span className="insider-agg-meta">{agg.withPriceData}/{agg.filingCount} filings with price data</span>
      </div>
      <div className="insider-agg-buckets">
        <BucketCell label="Buy (P)" count={agg.buy.count} avgDeltaPct={agg.buy.avgDeltaPct} />
        <BucketCell label="Sell (S)" count={agg.sell.count} avgDeltaPct={agg.sell.avgDeltaPct} />
        <BucketCell label="Other" count={agg.other.count} avgDeltaPct={agg.other.avgDeltaPct} />
      </div>
    </div>
  );
}
