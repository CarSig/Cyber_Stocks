import FilterSelect from '@/components/molecules/shared/FilterSelect.jsx';
import ChartCard from '@/components/molecules/shared/ChartCard.jsx';
import { useTickerContext } from '@/context/TickerContext.jsx';
import StockChart from '@/components/organisms/charts/StockChart.jsx';
import VolatilityChart from '@/components/organisms/charts/VolatilityChart.jsx';
import NewsChart from '@/components/organisms/charts/NewsChart.jsx';
import IntelligenceChart from '@/components/organisms/charts/IntelligenceChart.jsx';
import PeriodButtons from '@/components/molecules/shared/PeriodButtons.jsx';
import Analysis from '@/components/organisms/ticker/Analysis.jsx';
import TickerKPI from '@/pages/Ticker/TickerKPI.jsx';

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
}) {
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

      <ChartCard title="Prices" hidden={hidePrice} onToggle={() => setHidePrice((v) => !v)}>
        <StockChart
          quotes={allQuotes}
          compareQuotes={compareQuotes?.length ? compareQuotes : undefined}
          compareName={compareTicker || null}
          analysis={periodAnalysis}
          period={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
          overlays={overlays}
        />
      </ChartCard>

      <ChartCard title="Volatility" hidden={hideVolatility} onToggle={() => setHideVolatility((v) => !v)}>
        <VolatilityChart
          quotes={allQuotes}
          period={period}
          onPeriodChange={setPeriod}
          visibleRange={visibleRange}
          onRangeChange={setVisibleRange}
        />
      </ChartCard>

      {overlays.news.articles.length > 0 && (
        <ChartCard title="News Sentiment" hidden={hideNewsSentiment} onToggle={() => setHideNewsSentiment((v) => !v)}>
          <NewsChart
            articles={overlays.news.articles}
            analysis={overlays.news.analysis}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds}
          />
        </ChartCard>
      )}

      {intelligenceArticles?.length > 0 && (
        <ChartCard
          title="Intelligence Sentiment"
          hidden={hideIntelligence}
          onToggle={() => setHideIntelligence((v) => !v)}
        >
          <IntelligenceChart
            articles={intelligenceArticles}
            entityId={entityId}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds}
          />
        </ChartCard>
      )}

      {overlays.cyberNews.articles?.length > 0 && (
        <ChartCard
          title="Cyber News Sentiment"
          hidden={hideCyberNewsSentiment}
          onToggle={() => setHideCyberNewsSentiment((v) => !v)}
        >
          <NewsChart
            articles={overlays.cyberNews.articles}
            analysis={overlays.cyberNews.analysis}
            period={period}
            onPeriodChange={setPeriod}
            visibleRange={visibleRange}
            onRangeChange={setVisibleRange}
            quoteBounds={quoteBounds}
          />
        </ChartCard>
      )}

      <section>
        <h2>Analysis</h2>
        <Analysis analysis={periodAnalysis} />
      </section>
    </section>
  );
}
