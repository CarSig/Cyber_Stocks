import { useParams } from 'react-router-dom';
import './Ticker.css';
import { useMemo, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic cross-domain cast for buildChatContext
type AnyRecord = Record<string, any>;
import StateHandler from '@/components/common/feedback/StateHandler';
import { useStock, useCorrelation } from '@/features/tickers/hooks/useStock';
import { useEntityIntelligence } from '@/features/intelligence/hooks/useIntelligence';
import { useTrump } from '@/features/social/hooks/useTrump';
import { useResearch } from '@/features/tickers/hooks/useResearch';
import { useSimulation } from '@/features/simulations/hooks/useSimulation';
import { useThreatIntel } from '@/features/threat-intel/hooks/useThreatIntel';
import { useCyberNewsArticles } from '@/features/news/hooks/useCyberNews';
import { getAnalysis } from '@/features/news/api';
import { getSparklines } from '@/features/tickers/api';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useTickerThreatData } from '@/features/threat-intel/hooks/useTickerThreatData';
import { useTickerStore } from '@/stores/tickerStore';
import TickerWatchlist from '@/features/tickers/components/TickerWatchlist';
import { buildChatContext } from '@/features/tickers/utils/buildChatContext';
import TickerChat from '@/features/tickers/components/TickerChat';
import ChartsTab from './tabs/ChartsTab';
import SimulationTab from './tabs/SimulationTab';
import CorrelationsTab from './tabs/CorrelationsTab';
import ArticlesTab from './tabs/ArticlesTab';
import InfoTab from './tabs/InfoTab';
import DayTradeTab from './tabs/DayTradeTab';

function TickerContent() {
  const {
    activeTab,
    setActiveTab,
    compareTicker,
    period,
    correlagDays,
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
    showCyberNews,
    setShowCyberNews,
    reset,
  } = useTickerStore();

  const { ticker } = useParams<{ ticker: string }>();

  useEffect(() => {
    reset();
  }, [ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  const { error, isPending, allQuotes, compareQuotes, periodAnalysis, news, summary, companies } = useStock(
    ticker ?? '',
    {
      compareTicker: compareTicker ?? undefined,
      period,
    },
  );
  const quoteBounds = allQuotes?.length
    ? {
        from: [...allQuotes].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 10),
        to: [...allQuotes].sort((a, b) => b.date.localeCompare(a.date))[0].date.slice(0, 10),
      }
    : null;

  const companyName = companies ? (Object.entries(companies).find(([, t]) => t === ticker)?.[0] ?? '') : '';
  const entityId = companyName ? companyName.toLowerCase().replace(/\s+/g, '_') : '';
  const { articles: intelligenceArticles } = useEntityIntelligence(entityId || null);
  const HOUR = 60 * 60 * 1000;

  const { nvdData, otxData, kevData } = useTickerThreatData(companyName);
  const { data: newsAnalysisData } = useCachedQuery(['news-analysis', ticker], () => getAnalysis(ticker ?? ''), {
    ttl: HOUR,
    enabled: !!ticker,
    cacheKey: `news_analysis_${ticker}`,
  });
  const { data: correlationData, isFetching: correlationFetching } = useCorrelation(
    ticker ?? '',
    compareTicker ?? '',
    period,
    correlagDays,
  );
  const newsArticles = useMemo(() => news ?? [], [news]);

  const allTickers = companies ? Object.values(companies) : [];
  const SPARKLINES_TTL = 24 * 60 * 60 * 1000;
  const { data: sparklinesData } = useCachedQuery(
    ['sparklines', allTickers.join(',')],
    () => getSparklines(allTickers),
    {
      ttl: SPARKLINES_TTL,
      enabled: allTickers.length > 0,
      cacheKey: 'sparklines',
    },
  );

  const trump = useTrump(ticker ?? '');
  const research = useResearch(ticker ?? '');
  const simulation = useSimulation();
  const threatIntel = useThreatIntel(ticker ?? '');
  const { data: cyberNewsArticles } = useCyberNewsArticles(ticker ?? '');

  const cyberNewsForChart = useMemo(() => {
    if (!cyberNewsArticles) return [];
    return (cyberNewsArticles ?? []).map((article) => ({
      link: article.link,
      title: article.title,
      publisher: article.source,
      providerPublishTime: article.publishedAt ? new Date(article.publishedAt).getTime() / 1000 : 0,
    }));
  }, [cyberNewsArticles]);

  const cyberNewsAnalysis = useMemo(() => {
    if (!cyberNewsArticles) return {};
    return Object.fromEntries(
      (cyberNewsArticles ?? []).map((article) => [article.link, { sentiment: article.analysis?.sentiment ?? 0 }]),
    );
  }, [cyberNewsArticles]);

  const otherTickers = companies ? Object.entries(companies).filter(([, t]) => t !== ticker) : [];

  const overlays = {
    trump: { posts: trump.posts, show: showTrump, onToggle: setShowTrump },
    nvd: { data: nvdData?.items, show: showNvd, onToggle: setShowNvd },
    otx: { data: otxData?.items, show: showOtx, onToggle: setShowOtx },
    kev: { data: kevData?.items, show: showKev, onToggle: setShowKev },
    news: { articles: newsArticles, analysis: newsAnalysisData, show: showNews, onToggle: setShowNews },
    cyberNews: {
      articles: cyberNewsForChart,
      analysis: cyberNewsAnalysis,
      show: showCyberNews,
      onToggle: setShowCyberNews,
    },
  };

  const chatContext = buildChatContext({
    ticker: ticker ?? '',
    summary: summary as AnyRecord | undefined,
    periodAnalysis: periodAnalysis as AnyRecord | undefined,
    newsArticles: newsArticles as AnyRecord[],
    newsAnalysisData: newsAnalysisData as AnyRecord | undefined,
    simulationResult: simulation.result as AnyRecord | undefined,
    researchSections: research.sections ?? undefined,
    trump: trump as AnyRecord,
    nvdData: nvdData as AnyRecord | undefined,
    otxData: otxData as AnyRecord | undefined,
    kevData: kevData as AnyRecord | undefined,
    threatIntel: threatIntel as AnyRecord | undefined,
    correlationData: correlationData as AnyRecord | undefined,
    compareTicker: compareTicker ?? undefined,
    intelligenceArticles: (intelligenceArticles.data ?? []) as AnyRecord[],
    allQuotes,
  });

  return (
    <div>
      <StateHandler isPending={isPending} error={error}>
        <div className={`ticker-layout${showChat ? ' ticker-layout--chat-open' : ''}`}>
          <TickerWatchlist
            ticker={ticker}
            companies={companies}
            sparklinesData={
              sparklinesData as
                | Record<string, { changePct?: number | null; latestPrice?: number | null; closes?: number[] }>
                | undefined
            }
            showWatchlist={showWatchlist}
            onToggle={() => setShowWatchlist((v) => !v)}
          />

          <div className="ticker-main">
            <h1>{ticker}</h1>

            <nav className="ticker-tabs">
              {['charts', 'simulation', 'correlations', 'articles', 'info', 'day trade'].map((tab) => (
                <button
                  key={tab}
                  className={`ticker-tab${activeTab === tab ? ' ticker-tab--active' : ''}${tab === 'simulation' ? ' ticker-tab--accent' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>

            {activeTab === 'charts' && (
              <ChartsTab
                summary={summary}
                allQuotes={allQuotes}
                compareQuotes={compareQuotes}
                otherTickers={otherTickers}
                periodAnalysis={periodAnalysis}
                overlays={overlays as Record<string, unknown>}
                intelligenceArticles={intelligenceArticles.data as unknown[]}
                entityId={entityId}
                quoteBounds={quoteBounds}
              />
            )}

            {activeTab === 'simulation' && (
              <SimulationTab
                ticker={ticker ?? ''}
                allQuotes={allQuotes}
                onResult={simulation.onResult}
                companies={companies}
              />
            )}

            {activeTab === 'correlations' && (
              <CorrelationsTab
                ticker={ticker ?? ''}
                companies={companies}
                sparklinesData={sparklinesData as Record<string, { closes252?: number[] }> | undefined}
                otherTickers={otherTickers}
                correlationData={correlationData}
                correlationFetching={correlationFetching}
                trump={trump as Parameters<typeof CorrelationsTab>[0]['trump']}
                threatIntel={threatIntel as Parameters<typeof CorrelationsTab>[0]['threatIntel']}
              />
            )}

            {activeTab === 'articles' && <ArticlesTab ticker={ticker ?? ''} newsArticles={newsArticles} />}

            {activeTab === 'info' && (
              <InfoTab summary={summary} research={{ ...research, sections: research.sections ?? undefined }} />
            )}

            {activeTab === 'day trade' && <DayTradeTab ticker={ticker ?? ''} companies={companies} />}
          </div>

          <TickerChat
            showChat={showChat}
            onOpen={() => setShowChat(true)}
            onClose={() => setShowChat(false)}
            context={chatContext}
          />
        </div>
      </StateHandler>
    </div>
  );
}

export default function Ticker() {
  return <TickerContent />;
}
