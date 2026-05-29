import FilterSelect from '@/components/common/filters/FilterSelect';
import { ChartCard } from '@/features/charts/ui';
import { useTickerStore } from '@/stores/tickerStore';
import {
  ChartAuto,
  compareOverlay,
  trumpOverlay,
  threatIntelOverlay,
  newsOverlay,
  analysisMarkersOverlay,
  hvOverlay,
  atrOverlay,
  aggregateSentimentByDay,
  sentimentArticlesPlugin,
  type ChartPlugin,
} from '@/features/charts';
import { toSortedOHLC } from '@/features/charts/utils/series';
import { useMemo } from 'react';
import Analysis from '@/features/tickers/components/Analysis';
import TickerKPI from '@/features/tickers/components/TickerKPI';
import type { Quote, TickerSummary, NewsArticle, NewsAnalysisMap, TrumpPost, ThreatIntelItem } from '@/types';
import type { QuoteAnalysis } from '@/features/charts/types';
import { PRICE_SCALE_MIN_WIDTH, formatVolumeAxis } from '@/features/charts';

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
  } = useTickerStore();

  const news = overlays.news as { articles: NewsArticle[]; analysis?: NewsAnalysisMap } | undefined;
  const cyberNews = overlays.cyberNews as { articles?: NewsArticle[]; analysis?: NewsAnalysisMap } | undefined;

  const volumeData = useMemo(
    () =>
      (allQuotes ?? [])
        .filter((q) => q.volume != null)
        .map((q) => ({
          time: q.date.slice(0, 10) as `${number}-${number}-${number}`,
          value: Number(q.volume),
          color: '#3b82f6',
        })),
    [allQuotes],
  );

  const priceData = useMemo(() => toSortedOHLC(allQuotes ?? []), [allQuotes]);

  const volatilityPlugins: ChartPlugin[] = useMemo(
    () => [hvOverlay({ quotes: allQuotes ?? [] }), atrOverlay({ quotes: allQuotes ?? [] })],
    [allQuotes],
  );

  // Plugins for the Prices chart. Order matters: see useChartClickHandler's
  // precedence (news → trump → nvd → otx → kev). compareOverlay first because
  // it's a series, not a marker plugin.
  const trumpPosts = (overlays.trump as { posts?: TrumpPost[] } | undefined)?.posts;
  const nvdItems = (overlays.nvd as { data?: ThreatIntelItem[] } | undefined)?.data;
  const otxItems = (overlays.otx as { data?: ThreatIntelItem[] } | undefined)?.data;
  const kevItems = (overlays.kev as { data?: ThreatIntelItem[] } | undefined)?.data;
  const pricePlugins: ChartPlugin[] = useMemo(() => {
    const list: (ChartPlugin | null)[] = [
      compareQuotes?.length
        ? compareOverlay({ quotes: compareQuotes, label: compareTicker ?? 'Compare', defaultEnabled: true })
        : null,
      news?.articles?.length
        ? newsOverlay({
            articles: news.articles,
            analysis: news.analysis ?? null,
            quotes: allQuotes ?? [],
            defaultEnabled: true,
          })
        : null,
      trumpPosts?.length ? trumpOverlay({ posts: trumpPosts, quotes: allQuotes ?? [] }) : null,
      nvdItems?.length ? threatIntelOverlay({ variant: 'nvd', items: nvdItems }) : null,
      otxItems?.length ? threatIntelOverlay({ variant: 'otx', items: otxItems }) : null,
      kevItems?.length ? threatIntelOverlay({ variant: 'kev', items: kevItems }) : null,
      analysisMarkersOverlay({ analysis: (periodAnalysis as QuoteAnalysis) ?? null }),
    ];
    return list.filter((p): p is ChartPlugin => p !== null);
  }, [
    compareQuotes,
    compareTicker,
    news?.articles,
    news?.analysis,
    trumpPosts,
    nvdItems,
    otxItems,
    kevItems,
    allQuotes,
    periodAnalysis,
  ]);

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

      <ChartCard title="Prices" hidden={hidePrice} onToggle={() => setHidePrice(!hidePrice)}>
        <ChartAuto
          data={priceData}
          defaultType="Area"
          availableTypes={['Candlestick', 'Bar', 'Line', 'Area', 'Baseline']}
          hidePeriodControls
          selectedPeriod={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
          plugins={pricePlugins}
          priceScaleMinWidth={PRICE_SCALE_MIN_WIDTH}
          toolbarExtras={compareTicker ? <span className="chart-compare-label">● {compareTicker}</span> : null}
        />
      </ChartCard>

      <ChartCard title="Volume">
        <ChartAuto
          data={volumeData}
          defaultType="Histogram"
          availableTypes={['Histogram']}
          hideTypeControls
          hidePeriodControls
          selectedPeriod={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
          resize={{ enabled: true }}
          priceFormat={formatVolumeAxis}
          priceScaleMinWidth={PRICE_SCALE_MIN_WIDTH}
          toolbarExtras={<span className="chart-series-label chart-series-label-ml">Yahoo Volume</span>}
        />
      </ChartCard>

      <ChartCard title="Volatility" hidden={hideVolatility} onToggle={() => setHideVolatility(!hideVolatility)}>
        <ChartAuto
          data={[]}
          defaultType="Line"
          availableTypes={['Line']}
          hideTypeControls
          hidePeriodControls
          selectedPeriod={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
          plugins={volatilityPlugins}
          priceScaleMinWidth={PRICE_SCALE_MIN_WIDTH}
        />
      </ChartCard>

      {(news?.articles?.length ?? 0) > 0 && (
        <ChartCard
          title="News Sentiment"
          hidden={hideNewsSentiment}
          onToggle={() => setHideNewsSentiment(!hideNewsSentiment)}
        >
          <SentimentHistogram
            articles={news!.articles}
            getSentiment={(a) => news?.analysis?.[a.link]?.sentiment ?? null}
            getDate={timestampDate}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds ?? undefined}
            instanceId="news"
          />
        </ChartCard>
      )}

      {(intelligenceArticles?.length ?? 0) > 0 && (
        <ChartCard
          title="Intelligence Sentiment"
          hidden={hideIntelligence}
          onToggle={() => setHideIntelligence(!hideIntelligence)}
        >
          <SentimentHistogram
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
            instanceId="intelligence"
          />
        </ChartCard>
      )}

      {(cyberNews?.articles?.length ?? 0) > 0 && (
        <ChartCard
          title="Cyber News Sentiment"
          hidden={hideCyberNewsSentiment}
          onToggle={() => setHideCyberNewsSentiment?.(!hideCyberNewsSentiment)}
        >
          <SentimentHistogram
            articles={cyberNews!.articles!}
            getSentiment={(a) => cyberNews?.analysis?.[a.link]?.sentiment ?? null}
            getDate={timestampDate}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds ?? undefined}
            instanceId="cyber-news"
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

// --- Sentiment histogram helper ----------------------------------------

/** Parses the common `providerPublishTime` shape (unix-seconds string, unix-seconds number, or ISO string) into ISO. */
function timestampDate(a: NewsArticle): string | null {
  const ts = a.providerPublishTime;
  if (!ts) return null;
  return new Date(
    typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
  ).toISOString();
}

type SentimentHistogramProps = {
  articles: NewsArticle[];
  getSentiment: (a: NewsArticle) => number | null;
  getDate: (a: NewsArticle) => string | null;
  period?: number | null;
  onPeriodChange?: (days: number) => void;
  visibleRange?: { from: string; to: string } | null;
  onRangeChange?: (range: { from: string; to: string }) => void;
  quoteBounds?: { from: string; to: string };
  /** Unique id so the click-modal plugin doesn't collide across multiple
   *  sentiment histograms on the same page. */
  instanceId: string;
};

function SentimentHistogram({
  articles,
  getSentiment,
  getDate,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
  quoteBounds,
  instanceId,
}: SentimentHistogramProps) {
  const { countData, articlesByDay } = useMemo(
    () => aggregateSentimentByDay({ articles, getSentiment, getDate, quoteBounds: quoteBounds ?? null }),
    [articles, getSentiment, getDate, quoteBounds],
  );
  const plugins: ChartPlugin[] = useMemo(
    () => [sentimentArticlesPlugin({ articlesByDay, id: `sentiment-${instanceId}` })],
    [articlesByDay, instanceId],
  );
  return (
    <ChartAuto
      data={countData}
      defaultType="Histogram"
      availableTypes={['Histogram']}
      hideTypeControls
      hidePeriodControls
      selectedPeriod={period}
      onPeriodChange={onPeriodChange}
      visibleRange={visibleRange}
      onRangeChange={onRangeChange}
      plugins={plugins}
      resize={{ enabled: true }}
      toolbarExtras={
        <span className="chart-series-label chart-series-label-ml">
          Bar height = article count · Color = avg sentiment
          <span className="sentiment-gradient-legend" />
        </span>
      }
    />
  );
}
