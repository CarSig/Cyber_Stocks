import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { useStock, useCorrelation } from "../../hooks/useStock.js";
import { useEntityIntelligence } from "../../hooks/useIntelligence.js";
import { useTrump } from "../../hooks/useTrump.js";
import { useResearch } from "../../hooks/useResearch.js";
import { useSimulation } from "../../hooks/useSimulation.js";
import { useThreatIntel } from "../../hooks/useThreatIntel.js";
import { getNewsAnalysis, getSparklines } from "../../api.js";
import { useCachedQuery } from "../../hooks/useCachedQuery.js";
import { useTickerThreatData } from "../../hooks/useTickerThreatData.js";
import { TickerProvider, useTickerContext } from "../../context/TickerContext.jsx";
import { TABS } from "./constants.js";
import TickerWatchlist from "./TickerWatchlist.jsx";
import { buildChatContext } from "./buildChatContext.js";
import TickerChat from "./TickerChat.jsx";
import ChartsTab from "./tabs/ChartsTab.jsx";
import SimulationTab from "./tabs/SimulationTab.jsx";
import CorrelationsTab from "./tabs/CorrelationsTab.jsx";
import ArticlesTab from "./tabs/ArticlesTab.jsx";
import InfoTab from "./tabs/InfoTab.jsx";

function TickerContent() {
  const {
    activeTab,
    setActiveTab,
    compareTicker,
    setCompareTicker,
    period,
    setPeriod,
    visibleRange,
    setVisibleRange,
    correlagDays,
    setCorrelagDays,
    showChat,
    setShowChat,
    showWatchlist,
    setShowWatchlist,
    showTrump,
    setShowTrump,
    showNvd,
    setShowNvd,
    showOtx,
    setShowOtx,
    showKev,
    setShowKev,
    showNews,
    setShowNews,
    hidePrice,
    setHidePrice,
    hideVolatility,
    setHideVolatility,
    hideNewsSentiment,
    setHideNewsSentiment,
    hideIntelligence,
    setHideIntelligence,
  } = useTickerContext();

  const { ticker } = useParams();

  const { error, isPending, allQuotes, compareQuotes, periodAnalysis, news, summary, companies } = useStock(ticker, { compareTicker, period });
  const quoteBounds = allQuotes?.length
    ? { from: [...allQuotes].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 10), to: [...allQuotes].sort((a, b) => b.date.localeCompare(a.date))[0].date.slice(0, 10) }
    : null;

  const companyName = companies ? (Object.entries(companies).find(([, t]) => t === ticker)?.[0] ?? "") : "";
  const entityId = companyName ? companyName.toLowerCase().replace(/\s+/g, "_") : "";
  const { articles: intelligenceArticles } = useEntityIntelligence(entityId || null);
  const HOUR = 60 * 60 * 1000;

  const { nvdData, otxData, kevData } = useTickerThreatData(companyName);
  const { data: newsAnalysisData } = useCachedQuery(["news-analysis", ticker],   () => getNewsAnalysis(ticker),                      { ttl: HOUR, enabled: !!ticker,      cacheKey: `news_analysis_${ticker}` });
  const { data: correlationData, isFetching: correlationFetching } = useCorrelation(ticker, compareTicker, period, correlagDays);
  const newsArticles = useMemo(() => news?.news ?? [], [news?.news]);

  const allTickers = companies ? Object.values(companies) : [];
  const SPARKLINES_TTL = 24 * 60 * 60 * 1000;
  const { data: sparklinesData } = useCachedQuery(["sparklines", allTickers.join(",")], () => getSparklines(allTickers), { ttl: SPARKLINES_TTL, enabled: allTickers.length > 0, cacheKey: "sparklines" });

  const trump = useTrump(ticker);
  const research = useResearch(ticker);
  const simulation = useSimulation();
  const threatIntel = useThreatIntel(ticker);

  if (isPending) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const otherTickers = companies ? Object.entries(companies).filter(([, t]) => t !== ticker) : [];

  const overlays = {
    trump: { posts: trump.posts,          show: showTrump, onToggle: setShowTrump },
    nvd:   { data: nvdData?.items,        show: showNvd,   onToggle: setShowNvd },
    otx:   { data: otxData?.items,        show: showOtx,   onToggle: setShowOtx },
    kev:   { data: kevData?.items,        show: showKev,   onToggle: setShowKev },
    news:  { articles: newsArticles, analysis: newsAnalysisData, show: showNews, onToggle: setShowNews },
  };

  const chatContext = buildChatContext({
    ticker, summary, periodAnalysis, newsArticles, newsAnalysisData,
    simulationResult: simulation.result,
    researchSections: research.sections,
    trump, nvdData, otxData, kevData,
    threatIntel, correlationData, compareTicker,
    intelligenceArticles: intelligenceArticles.data,
    allQuotes,
  });

  return (
    <div className={`ticker-layout${showChat ? " ticker-layout--chat-open" : ""}`}>
      <TickerWatchlist
        ticker={ticker}
        companies={companies}
        sparklinesData={sparklinesData}
        showWatchlist={showWatchlist}
        onToggle={() => setShowWatchlist((v) => !v)}
      />

      <div className="ticker-main">
        <h1>{ticker}</h1>

        <nav className="ticker-tabs">
          {TABS.map((tab) => (
            <button key={tab} className={`ticker-tab${activeTab === tab ? " ticker-tab--active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {activeTab === "charts" && (
          <ChartsTab
            summary={summary} allQuotes={allQuotes} compareQuotes={compareQuotes}
            compareTicker={compareTicker} setCompareTicker={setCompareTicker} otherTickers={otherTickers}
            period={period} setPeriod={setPeriod} visibleRange={visibleRange} setVisibleRange={setVisibleRange}
            periodAnalysis={periodAnalysis}
            hidePrice={hidePrice} setHidePrice={setHidePrice}
            hideVolatility={hideVolatility} setHideVolatility={setHideVolatility}
            hideNewsSentiment={hideNewsSentiment} setHideNewsSentiment={setHideNewsSentiment}
            hideIntelligence={hideIntelligence} setHideIntelligence={setHideIntelligence}
            overlays={overlays}
            intelligenceArticles={intelligenceArticles.data} entityId={entityId} quoteBounds={quoteBounds}
            onShowCorrelations={() => setActiveTab("correlations")}
          />
        )}

        {activeTab === "simulation" && (
          <SimulationTab ticker={ticker} allQuotes={allQuotes} onResult={simulation.onResult} />
        )}

        {activeTab === "correlations" && (
          <CorrelationsTab
            ticker={ticker} companies={companies} sparklinesData={sparklinesData}
            compareTicker={compareTicker} setCompareTicker={setCompareTicker} otherTickers={otherTickers}
            correlationData={correlationData} correlationFetching={correlationFetching}
            correlagDays={correlagDays} setCorrelagDays={setCorrelagDays}
            trump={trump} threatIntel={threatIntel}
          />
        )}

        {activeTab === "articles" && (
          <ArticlesTab ticker={ticker} newsArticles={newsArticles} />
        )}

        {activeTab === "info" && (
          <InfoTab summary={summary} research={research} />
        )}
      </div>

      <TickerChat
        showChat={showChat}
        onOpen={() => setShowChat(true)}
        onClose={() => setShowChat(false)}
        context={chatContext}
      />
    </div>
  );
}

export default function Ticker() {
  return (
    <TickerProvider>
      <TickerContent />
    </TickerProvider>
  );
}
