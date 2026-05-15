import FilterSelect from '@/components/molecules/shared/FilterSelect';
import ChartCard from '@/components/molecules/shared/ChartCard';
import { useTickerContext } from '@/context/TickerContext';
import StockChart from '@/components/organisms/charts/StockChart';
import VolatilityChart from '@/components/organisms/charts/VolatilityChart';
import NewsChart from '@/components/organisms/charts/NewsChart';
import IntelligenceChart from '@/components/organisms/charts/IntelligenceChart';
import PeriodButtons from '@/components/molecules/shared/PeriodButtons';
import Analysis from '@/components/organisms/ticker/Analysis';
import TickerKPI from '@/pages/Ticker/TickerKPI';
import type { Quote, TickerSummary, NewsArticle } from '@/types';

type ChartsTabProps = {
  summary?: TickerSummary | null;
  allQuotes?: Quote[];
  compareQuotes?: Quote[];
  otherTickers: [string, string][];
  periodAnalysis?: unknown;
  overlays: Record<string, unknown>;
  intelligenceArticles?: unknown[];
  entityId?: string;
  quoteBounds?: { from: string; to: string } | null;
  hideCyberNewsSentiment?: boolean;
  setHideCyberNewsSentiment?: (v: boolean) => void;
};

export default function ChartsTab({
  summary,
  allQuotes,
  compareQuotes,
  otherTickers,
  periodAnalysis,
  overlays,
  intelligenceArticles,
  entityId,
  quoteBounds,
  hideCyberNewsSentiment,
  setHideCyberNewsSentiment,
}: ChartsTabProps) {
  const {
    compareTicker,
    setCompareTicker,
    period,
    setPeriod,
    visibleRange,
    setVisibleRange,
    hidePrice,
    setHidePrice,
    hideVolatility,
    setHideVolatility,
    hideNewsSentiment,
    setHideNewsSentiment,
    hideIntelligence,
    setHideIntelligence,
  } = useTickerContext();

  const newsOverlay = overlays.news as { articles: NewsArticle[]; analysis?: Parameters<typeof NewsChart>[0]['analysis'] } | undefined;
  const cyberNewsOverlay = overlays.cyberNews as { articles?: NewsArticle[]; analysis?: Parameters<typeof NewsChart>[0]['analysis'] } | undefined;

  return (
    <section>
      <div className="compare-row">
        <FilterSelect
          value={compareTicker}
          onChange={setCompareTicker}
          placeholder="Compare with"
          allLabel="None"
          className="w-56"
          options={otherTickers.map(([name, t]) => ({ label: `${name} (${t})`, value: t }))}
        />
      </div>

      <TickerKPI summary={summary} quotes={allQuotes} />

      <PeriodButtons
        activeDays={period}
        onSelect={(days) => {
          setVisibleRange(null);
          setPeriod(days);
        }}
        showCustomLabel
      />

      <ChartCard title="Prices" hidden={hidePrice} onToggle={() => setHidePrice(!hidePrice)}>
        <StockChart
          quotes={allQuotes ?? []}
          compareQuotes={compareQuotes?.length ? compareQuotes : undefined}
          compareName={compareTicker ?? undefined}
          analysis={periodAnalysis as Parameters<typeof StockChart>[0]['analysis']}
          period={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
          overlays={overlays as Parameters<typeof StockChart>[0]['overlays']}
        />
      </ChartCard>

      <ChartCard title="Volatility" hidden={hideVolatility} onToggle={() => setHideVolatility(!hideVolatility)}>
        <VolatilityChart
          quotes={allQuotes ?? []}
          period={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
        />
      </ChartCard>

      {(newsOverlay?.articles?.length ?? 0) > 0 && (
        <ChartCard title="News Sentiment" hidden={hideNewsSentiment} onToggle={() => setHideNewsSentiment(!hideNewsSentiment)}>
          <NewsChart
            articles={newsOverlay!.articles}
            analysis={newsOverlay?.analysis}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds ?? undefined}
          />
        </ChartCard>
      )}

      {(intelligenceArticles?.length ?? 0) > 0 && (
        <ChartCard
          title="Intelligence Sentiment"
          hidden={hideIntelligence}
          onToggle={() => setHideIntelligence(!hideIntelligence)}
        >
          <IntelligenceChart
            articles={intelligenceArticles as Parameters<typeof IntelligenceChart>[0]['articles']}
            entityId={entityId}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds ?? undefined}
          />
        </ChartCard>
      )}

      {(cyberNewsOverlay?.articles?.length ?? 0) > 0 && (
        <ChartCard
          title="Cyber News Sentiment"
          hidden={hideCyberNewsSentiment}
          onToggle={() => setHideCyberNewsSentiment?.(!hideCyberNewsSentiment)}
        >
          <NewsChart
            articles={cyberNewsOverlay!.articles!}
            analysis={cyberNewsOverlay?.analysis}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds ?? undefined}
          />
        </ChartCard>
      )}

      <section>
        <h2>Analysis</h2>
        <Analysis analysis={periodAnalysis as Parameters<typeof Analysis>[0]['analysis']} />
      </section>
    </section>
  );
}
