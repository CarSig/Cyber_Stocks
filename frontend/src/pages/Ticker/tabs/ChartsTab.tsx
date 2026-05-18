import FilterSelect from '@/components/molecules/shared/FilterSelect';
import ChartCard from '@/components/molecules/shared/ChartCard';
import { useTickerContext } from '@/context/TickerContext';
import StockChart from '@/components/organisms/charts/StockChart';
import VolatilityChart from '@/components/organisms/charts/VolatilityChart';
import SentimentHistogramChart from '@/components/organisms/charts/SentimentHistogramChart';
import PeriodButtons from '@/components/molecules/shared/PeriodButtons';
import Analysis from '@/components/organisms/ticker/Analysis';
import TickerKPI from '@/pages/Ticker/TickerKPI';
import type { Quote, TickerSummary, NewsArticle, NewsAnalysisMap } from '@/types';

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

  const newsOverlay = overlays.news as
    | { articles: NewsArticle[]; analysis?: NewsAnalysisMap }
    | undefined;
  const cyberNewsOverlay = overlays.cyberNews as
    | { articles?: NewsArticle[]; analysis?: NewsAnalysisMap }
    | undefined;

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
        <ChartCard
          title="News Sentiment"
          hidden={hideNewsSentiment}
          onToggle={() => setHideNewsSentiment(!hideNewsSentiment)}
        >
          <SentimentHistogramChart
            articles={newsOverlay!.articles}
            getSentiment={(a) => newsOverlay?.analysis?.[a.link]?.sentiment ?? null}
            getDate={(a) => {
              const ts = a.providerPublishTime;
              if (!ts) return null;
              return new Date(
                typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
              ).toISOString();
            }}
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
          <SentimentHistogramChart
            articles={intelligenceArticles as NewsArticle[]}
            getSentiment={(a) => {
              const entities = (a as Record<string, unknown>)['entities'] as
                | Array<{ entityId: string; sentiment: number }>
                | undefined;
              const match = entities?.find((e) => e.entityId === entityId);
              const avg = entities?.length ? entities.reduce((s, e) => s + e.sentiment, 0) / entities.length : 0;
              return match?.sentiment ?? avg;
            }}
            getDate={(a) => (a.timestamp ? String(a.timestamp) : null)}
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
          <SentimentHistogramChart
            articles={cyberNewsOverlay!.articles!}
            getSentiment={(a) => cyberNewsOverlay?.analysis?.[a.link]?.sentiment ?? null}
            getDate={(a) => {
              const ts = a.providerPublishTime;
              if (!ts) return null;
              return new Date(
                typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
              ).toISOString();
            }}
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
