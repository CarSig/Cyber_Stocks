import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTickerContext } from "@/context/TickerContext.jsx";
import StockChart from "@/components/organisms/charts/StockChart.jsx";
import VolatilityChart from "@/components/organisms/charts/VolatilityChart.jsx";
import NewsChart from "@/components/organisms/charts/NewsChart.jsx";
import IntelligenceChart from "@/components/organisms/charts/IntelligenceChart.jsx";
import PeriodButtons from "@/components/molecules/shared/PeriodButtons.jsx";
import ChartToggleButton from "@/components/atoms/ChartToggleButton.jsx";
import Analysis from "@/components/organisms/ticker/Analysis.jsx";
import TickerKPI from "@/pages/Ticker/TickerKPI.jsx";

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
        <Label>Compare with:</Label>
        <Select value={compareTicker} onValueChange={setCompareTicker}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {otherTickers.map(([name, t]) => (
              <SelectItem key={t} value={t}>
                {name} ({t})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <div className="chart-card">
        <div className="chart-title-row">
          <h3 className="chart-title">Prices</h3>
          <ChartToggleButton active={hidePrice} onClick={() => setHidePrice((v) => !v)}>
            {hidePrice ? "Show Chart" : "Hide Chart"}
          </ChartToggleButton>
        </div>
        {!hidePrice && (
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
        )}
      </div>

      <div className="chart-card">
        <div className="chart-title-row">
          <h3 className="chart-title">Volatility</h3>
          <ChartToggleButton active={hideVolatility} onClick={() => setHideVolatility((v) => !v)}>
            {hideVolatility ? "Show Chart" : "Hide Chart"}
          </ChartToggleButton>
        </div>
        {!hideVolatility && (
          <VolatilityChart quotes={allQuotes} period={period} onPeriodChange={setPeriod} visibleRange={visibleRange} onRangeChange={setVisibleRange} />
        )}
      </div>

      {overlays.news.articles.length > 0 && (
        <div className="chart-card">
          <div className="chart-title-row">
            <h3 className="chart-title">News Sentiment</h3>
            <ChartToggleButton active={hideNewsSentiment} onClick={() => setHideNewsSentiment((v) => !v)}>
              {hideNewsSentiment ? "Show Chart" : "Hide Chart"}
            </ChartToggleButton>
          </div>
          {!hideNewsSentiment && (
            <NewsChart
              articles={overlays.news.articles}
              analysis={overlays.news.analysis}
              period={period}
              onPeriodChange={setPeriod}
              visibleRange={visibleRange}
              onRangeChange={setVisibleRange}
              quoteBounds={quoteBounds}
            />
          )}
        </div>
      )}

      {intelligenceArticles?.length > 0 && (
        <div className="chart-card">
          <div className="chart-title-row">
            <h3 className="chart-title">Intelligence Sentiment</h3>
            <ChartToggleButton active={hideIntelligence} onClick={() => setHideIntelligence((v) => !v)}>
              {hideIntelligence ? "Show Chart" : "Hide Chart"}
            </ChartToggleButton>
          </div>
          {!hideIntelligence && (
            <IntelligenceChart
              articles={intelligenceArticles}
              entityId={entityId}
              period={period}
              onPeriodChange={setPeriod}
              visibleRange={visibleRange}
              onRangeChange={setVisibleRange}
              quoteBounds={quoteBounds}
            />
          )}
        </div>
      )}

      {overlays.cyberNews.articles?.length > 0 && (
        <div className="chart-card">
          <div className="chart-title-row">
            <h3 className="chart-title">Cyber News Sentiment</h3>
            <ChartToggleButton active={hideCyberNewsSentiment} onClick={() => setHideCyberNewsSentiment((v) => !v)}>
              {hideCyberNewsSentiment ? "Show Chart" : "Hide Chart"}
            </ChartToggleButton>
          </div>
          {!hideCyberNewsSentiment && (
            <NewsChart
              articles={overlays.cyberNews.articles}
              analysis={overlays.cyberNews.analysis}
              period={period}
              onPeriodChange={setPeriod}
              visibleRange={visibleRange}
              onRangeChange={setVisibleRange}
              quoteBounds={quoteBounds}
            />
          )}
        </div>
      )}

      <section>
        <h2>Analysis</h2>
        <Analysis analysis={periodAnalysis} />
      </section>
    </section>
  );
}
