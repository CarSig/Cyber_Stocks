import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BaseCard from '@/components/common/cards/BaseCard';
import FilterSelect from '@/components/common/filters/FilterSelect';
import { useTickerContext } from '@/context/TickerContext';
import { CorrelationBox } from '@/features/correlations/components';
import CorrLagTable from '@/features/tickers/components/CorrLagTable';
import type { CorrelationResult } from '@/types';

type TrumpState = {
  correlation?: CorrelationResult | null;
  lagImpact?: unknown;
  lagDays?: number;
  setLagDays?: (days: number) => void;
  correlationFetching?: boolean;
};

type ThreatIntelQuery = {
  data?: { correlation?: CorrelationResult; lagImpact?: unknown } | null;
  error?: Error | null;
  isPending?: boolean;
  isFetching?: boolean;
};

type ThreatIntelState = {
  nvd: ThreatIntelQuery;
  kev: ThreatIntelQuery;
  otx: ThreatIntelQuery;
  lagDays: number;
  setLagDays: (days: number) => void;
};

type CorrelationsTabProps = {
  ticker: string;
  companies?: Record<string, string>;
  sparklinesData?: Record<string, { closes252?: number[] }>;
  otherTickers: [string, string][];
  correlationData?: CorrelationResult | null;
  correlationFetching?: boolean;
  trump: TrumpState;
  threatIntel: ThreatIntelState;
};

export default function CorrelationsTab({
  ticker,
  companies,
  sparklinesData,
  otherTickers,
  correlationData,
  correlationFetching,
  trump,
  threatIntel,
}: CorrelationsTabProps) {
  const { compareTicker, setCompareTicker, correlagDays, setCorrelagDays } = useTickerContext();
  return (
    <section>
      {sparklinesData && (
        <BaseCard variant="article">
          <div className="chart-title-row">
            <h3 className="chart-title">Lag Correlation Table</h3>
            <span className="chart-card-subtitle">all stocks · 1y history · base leads</span>
          </div>
          <CorrLagTable ticker={ticker} sparklinesData={sparklinesData} companies={companies} />
        </BaseCard>
      )}

      <div className="compare-row compare-row-mt">
        <FilterSelect
          value={compareTicker}
          onChange={setCompareTicker}
          placeholder="Compare with"
          allLabel="None"
          className="w-56"
          options={otherTickers.map(([name, t]) => ({ label: `${name} (${t})`, value: t }))}
        />
      </div>

      {compareTicker && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">vs {compareTicker}</h3>
          <CorrelationBox
            correlation={correlationData ?? undefined}
            lagDays={correlagDays}
            onLagDaysChange={(v) => setCorrelagDays(Math.max(0, Math.min(30, v)))}
            isFetching={correlationFetching}
            isPending={!correlationData && correlationFetching}
          />
        </div>
      )}

      {Boolean(trump.correlation || trump.lagImpact) && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Trump Sentiment</h3>
          <CorrelationBox
            correlation={trump.correlation?.r != null ? trump.correlation : undefined}
            lagImpact={trump.lagImpact as Parameters<typeof CorrelationBox>[0]['lagImpact']}
            lagDays={trump.lagDays}
            onLagDaysChange={trump.setLagDays}
            isFetching={trump.correlationFetching}
          />
        </div>
      )}

      {[
        { key: 'nvd' as const, label: 'NVD CVEs', eventLabel: 'CVE disclosure' },
        { key: 'kev' as const, label: 'CISA KEV', eventLabel: 'KEV listing' },
        { key: 'otx' as const, label: 'OTX Pulses', eventLabel: 'OTX pulse' },
      ].map(({ key, label, eventLabel }) => {
        const q = threatIntel[key];
        if (!q.data && !q.error) return null;
        return (
          <div key={key} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
            <CorrelationBox
              correlation={q.data?.correlation}
              lagImpact={q.data?.lagImpact as Parameters<typeof CorrelationBox>[0]['lagImpact']}
              lagImpactLabel={eventLabel}
              isPending={q.isPending}
              isFetching={q.isFetching}
              error={q.error ?? undefined}
            />
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2 border-t">
        <Label>Threat Intel lag days</Label>
        <Input
          type="number"
          min="0"
          max="30"
          value={threatIntel.lagDays}
          onChange={(e) => threatIntel.setLagDays(Math.max(0, Math.min(30, Number(e.target.value))))}
          className="correlation-lag-input"
        />
      </div>
    </section>
  );
}
