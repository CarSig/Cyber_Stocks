import { Input } from "@/components/ui/input";
import FilterSelect from "@/components/molecules/shared/FilterSelect.jsx";
import { useTickerContext } from "@/context/TickerContext.jsx";
import CorrelationBox from "@/components/organisms/ticker/CorrelationBox.jsx";
import CorrLagTable from "@/pages/Ticker/CorrLagTable.jsx";

export default function CorrelationsTab({
  ticker, companies, sparklinesData,
  otherTickers,
  correlationData, correlationFetching,
  trump, threatIntel,
}) {
  const { compareTicker, setCompareTicker, correlagDays, setCorrelagDays } = useTickerContext();
  return (
    <section>
      {sparklinesData && (
        <div className="chart-card">
          <div className="chart-title-row">
            <h3 className="chart-title">Lag Correlation Table</h3>
            <span className="chart-card-subtitle">all stocks · 1y history · base leads</span>
          </div>
          <CorrLagTable ticker={ticker} sparklinesData={sparklinesData} companies={companies} />
        </div>
      )}

      <div className="compare-row" style={{ marginTop: "1rem" }}>
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
            correlation={correlationData}
            lagDays={correlagDays}
            onLagDaysChange={(v) => setCorrelagDays(Math.max(0, Math.min(30, v)))}
            isFetching={correlationFetching}
            isPending={!correlationData && correlationFetching}
          />
        </div>
      )}

      {(trump.correlation || trump.lagImpact) && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Trump Sentiment</h3>
          <CorrelationBox
            correlation={trump.correlation?.r != null ? trump.correlation : undefined}
            lagImpact={trump.lagImpact}
            lagDays={trump.lagDays}
            onLagDaysChange={trump.setLagDays}
            isFetching={trump.correlationFetching}
          />
        </div>
      )}

      {[
        { key: "nvd", label: "NVD CVEs", eventLabel: "CVE disclosure" },
        { key: "kev", label: "CISA KEV", eventLabel: "KEV listing" },
        { key: "otx", label: "OTX Pulses", eventLabel: "OTX pulse" },
      ].map(({ key, label, eventLabel }) => {
        const q = threatIntel[key];
        if (!q.data && !q.error) return null;
        return (
          <div key={key} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
            <CorrelationBox
              correlation={q.data?.correlation}
              lagImpact={q.data?.lagImpact}
              lagImpactLabel={eventLabel}
              isPending={q.isPending}
              isFetching={q.isFetching}
              error={q.error}
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
