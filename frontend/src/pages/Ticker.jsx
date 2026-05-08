import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StockChart from "../components/organisms/charts/StockChart.jsx";
import VolatilityChart from "../components/organisms/charts/VolatilityChart.jsx";
import NewsChart from "../components/organisms/charts/NewsChart.jsx";
import IntelligenceChart from "../components/organisms/charts/IntelligenceChart.jsx";
import PeriodButtons from "../components/molecules/PeriodButtons.jsx";
import ChartToggleButton from "../components/atoms/ChartToggleButton.jsx";
import Summary from "../components/organisms/Summary.jsx";
import Analysis from "../components/organisms/Analysis.jsx";
import Chat from "../components/organisms/Chat.jsx";
import Simulation from "../components/organisms/Simulation.jsx";
import { useStock, useCorrelation } from "../hooks/useStock.js";
import { useEntityIntelligence2 } from "../hooks/useIntelligence.js";
import { useTrump } from "../hooks/useTrump.js";
import { useResearch } from "../hooks/useResearch.js";
import { useSimulation } from "../hooks/useSimulation.js";
import { useThreatIntel } from "../hooks/useThreatIntel.js";
import NewsSection from "../components/organisms/NewsSection.jsx";
import CorrelationBox from "../components/organisms/CorrelationBox.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getNvd, getOtx, getKev, getNewsAnalysis } from "../api.js";

export default function Ticker() {
  const { ticker } = useParams();
  const [compareTicker, setCompareTicker] = useState("");
  const [period, setPeriod] = useState(null);
  const [correlagDays, setCorrelagDays] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [showCorrelations, setShowCorrelations] = useState(false);
  const [showTrump, setShowTrump] = useState(false);
  const [showNvd, setShowNvd] = useState(false);
  const [showOtx, setShowOtx] = useState(false);
  const [showKev, setShowKev] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [hideVolatility, setHideVolatility] = useState(false);
  const [hideNewsSentiment, setHideNewsSentiment] = useState(false);
  const [hideIntelligence, setHideIntelligence] = useState(false);

  const { error, isPending, allQuotes, compareQuotes, periodAnalysis, news, summary, companies } =
    useStock(ticker, { compareTicker, period });

  const companyName = companies ? (Object.entries(companies).find(([, t]) => t === ticker)?.[0] ?? "") : "";
  const entityId = companyName ? companyName.toLowerCase().replace(/\s+/g, "_") : "";
  const { articles: intelligenceArticles } = useEntityIntelligence2(entityId || null);
  const { data: nvdData } = useQuery({
    queryKey: ["nvd-ticker", companyName],
    queryFn: () => getNvd({ limit: 500, company: companyName }),
    enabled: !!companyName,
  });
  const { data: otxData } = useQuery({
    queryKey: ["otx-ticker", companyName],
    queryFn: () => getOtx({ limit: 500, company: companyName }),
    enabled: !!companyName,
  });
  const { data: kevData } = useQuery({
    queryKey: ["kev-ticker", companyName],
    queryFn: () => getKev({ limit: 500, company: companyName }),
    enabled: !!companyName,
  });
  const { data: correlationData, isFetching: correlationFetching } = useCorrelation(ticker, compareTicker, period, correlagDays);
  const { data: newsAnalysisData } = useQuery({
    queryKey: ["news-analysis", ticker],
    queryFn: () => getNewsAnalysis(ticker),
    enabled: !!ticker,
  });
  const newsArticles = useMemo(() => news?.news ?? [], [news?.news]);

  const trump = useTrump(ticker);
  const research = useResearch(ticker);
  const simulation = useSimulation();
  const threatIntel = useThreatIntel(ticker);

  if (isPending) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const otherTickers = companies ? Object.entries(companies).filter(([, t]) => t !== ticker) : [];

  const chatContext = `Ticker: ${ticker}
Company: ${summary?.price?.longName ?? ticker}
Sector: ${summary?.assetProfile?.sector ?? "N/A"}
Industry: ${summary?.assetProfile?.industry ?? "N/A"}
Market Cap: ${summary?.summaryDetail?.marketCap ?? "N/A"}
52w High: ${summary?.summaryDetail?.fiftyTwoWeekHigh ?? "N/A"}
52w Low: ${summary?.summaryDetail?.fiftyTwoWeekLow ?? "N/A"}
PE Ratio: ${summary?.summaryDetail?.trailingPE ?? "N/A"}
Revenue: ${summary?.financialData?.totalRevenue ?? "N/A"}
Gross Profit: ${summary?.financialData?.grossProfits ?? "N/A"}
Biggest Same-Day Swing: ${periodAnalysis?.biggestSameDayDiff?.difference ?? "N/A"} on ${periodAnalysis?.biggestSameDayDiff?.date ?? "N/A"}
Recent news: ${newsArticles.slice(0, 3).map((a) => a.title).join("; ") || "N/A"}${
    simulation.result ? `\n\nSimulation results:
Total invested: $${Number(simulation.result.totalInvested).toFixed(2)}
Shares held: ${Number(simulation.result.finalShares).toFixed(4)}
Current shares value: $${Number(simulation.result.sharesValue).toFixed(2)}
Cash withdrawn: $${Number(simulation.result.cashWithdrawn).toFixed(2)}
Transactions: ${simulation.result.transactions.map((t) => `${t.date} ${t.type} ${Number(t.shares).toFixed(4)}sh @ $${Number(t.price).toFixed(2)}`).join(", ")}` : ""
  }${
    research.sections?.length ? `\n\nMarket research:\n${research.sections.map((s) => `${s.title}:\n${s.text}`).join("\n\n")}` : ""
  }`;

  return (
    <div className={`ticker-layout${showChat ? " ticker-layout--chat-open" : ""}`}>
      <div className="ticker-main">
        <h1>{ticker}</h1>

        <section>
          <h2>History ({allQuotes.length} quotes)</h2>
          <div className="compare-row">
            <Label>Compare with:</Label>
            <Select value={compareTicker} onValueChange={setCompareTicker}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {otherTickers.map(([name, t]) => (
                  <SelectItem key={t} value={t}>{name} ({t})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PeriodButtons activeDays={period} onSelect={setPeriod} showCustomLabel />

          <div className="chart-title-row">
            <h3 className="chart-title">Prices</h3>
            <ChartToggleButton active={hidePrice} onClick={() => setHidePrice((v) => !v)}>
              {hidePrice ? "Show Chart" : "Hide Chart"}
            </ChartToggleButton>
          </div>
          {!hidePrice && (
            <StockChart
              quotes={allQuotes}
              compareQuotes={compareQuotes.length ? compareQuotes : undefined}
              compareName={compareTicker || null}
              analysis={periodAnalysis}
              period={period}
              onPeriodChange={setPeriod}
              trumpPosts={trump.posts}
              showTrump={showTrump}
              onTrumpToggle={setShowTrump}
              nvdVulns={nvdData?.items}
              showNvd={showNvd}
              onNvdToggle={setShowNvd}
              otxPulses={otxData?.items}
              showOtx={showOtx}
              onOtxToggle={setShowOtx}
              kevItems={kevData?.items}
              showKev={showKev}
              onKevToggle={setShowKev}
              newsArticles={newsArticles}
              newsAnalysis={newsAnalysisData}
              showNews={showNews}
              onNewsToggle={setShowNews}
              onShowCorrelations={() => setShowCorrelations(true)}
            />
          )}

          <div className="chart-title-row">
            <h3 className="chart-title">Volatility</h3>
            <ChartToggleButton active={hideVolatility} onClick={() => setHideVolatility((v) => !v)}>
              {hideVolatility ? "Show Chart" : "Hide Chart"}
            </ChartToggleButton>
          </div>
          {!hideVolatility && (
            <VolatilityChart
              quotes={allQuotes}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}

          {newsArticles.length > 0 && (
            <>
              <div className="chart-title-row">
                <h3 className="chart-title">News Sentiment</h3>
                <ChartToggleButton active={hideNewsSentiment} onClick={() => setHideNewsSentiment((v) => !v)}>
                  {hideNewsSentiment ? "Show Chart" : "Hide Chart"}
                </ChartToggleButton>
              </div>
              {!hideNewsSentiment && (
                <NewsChart
                  articles={newsArticles}
                  analysis={newsAnalysisData}
                  period={period}
                  onPeriodChange={setPeriod}
                />
              )}
            </>
          )}

          {intelligenceArticles.data?.length > 0 && (
            <>
              <div className="chart-title-row">
                <h3 className="chart-title">Intelligence Sentiment</h3>
                <ChartToggleButton active={hideIntelligence} onClick={() => setHideIntelligence((v) => !v)}>
                  {hideIntelligence ? "Show Chart" : "Hide Chart"}
                </ChartToggleButton>
              </div>
              {!hideIntelligence && (
                <IntelligenceChart
                  articles={intelligenceArticles.data}
                  entityId={entityId}
                  period={period}
                  onPeriodChange={setPeriod}
                />
              )}
            </>
          )}
        </section>

        <Dialog open={showCorrelations} onOpenChange={setShowCorrelations}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Correlations</DialogTitle>
            </DialogHeader>

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
              { key: "nvd", label: "NVD CVEs",    eventLabel: "CVE disclosure" },
              { key: "kev", label: "CISA KEV",     eventLabel: "KEV listing" },
              { key: "otx", label: "OTX Pulses",   eventLabel: "OTX pulse" },
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
          </DialogContent>
        </Dialog>

        <section>
          <h2>Analysis</h2>
          <Analysis analysis={periodAnalysis} />
        </section>

        <section>
          <h2>Market Research</h2>
          <Button onClick={research.run} disabled={research.isPending} className="research-btn">
            {research.isPending ? "Researching…" : "Run Market Research"}
          </Button>
          {research.sections && research.sections.map((s, i) => (
            <div key={i} className="research-item">
              <h3 className="research-title">{s.title}</h3>
              <pre className="research-text">{s.text}</pre>
            </div>
          ))}
        </section>

        <section>
          <h2>Simulation</h2>
          <Simulation ticker={ticker} quotes={allQuotes} onResult={simulation.onResult} />
        </section>

        <section>
          <h2>Summary</h2>
          <Summary summary={summary} />
        </section>

        <NewsSection ticker={ticker} news={newsArticles} />
      </div>

      <div className={`chat-sidebar${showChat ? " chat-sidebar--open" : " chat-sidebar--collapsed"}`}>
        {showChat ? (
          <>
            <div className="chat-heading-row">
              <h2 className="chat-heading">AI Chat</h2>
              <button className="chat-close-btn" onClick={() => setShowChat(false)}>✕</button>
            </div>
            <div className="chat-wrapper">
              <Chat context={chatContext} />
            </div>
          </>
        ) : (
          <button className="chat-open-btn" onClick={() => setShowChat(true)}>
            <span className="chat-open-icon">✦</span> AI Chat
          </button>
        )}
      </div>
    </div>
  );
}
