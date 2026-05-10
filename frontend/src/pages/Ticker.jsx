import { useParams, Link } from "react-router-dom";
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
import { getNvd, getOtx, getKev, getNewsAnalysis, getSparklines } from "../api.js";
import { withLsCache } from "../utils/lsCache.js";

function fmtCompact(n) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtVol(n) {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function fmtPct(n) {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
}

function changePctOverBars(sorted, bars) {
  if (sorted.length < 2) return null;
  const latest = sorted.at(-1);
  const past = sorted.at(-(bars + 1)) ?? sorted[0];
  if (latest === past) return null;
  const a = past.adjclose ?? past.close;
  const b = latest.adjclose ?? latest.close;
  if (!a) return null;
  return (b - a) / a;
}

function TickerKPI({ summary, quotes }) {
  const ks = summary?.defaultKeyStatistics;
  const fd = summary?.financialData;
  const sp = summary?.summaryProfile;

  // Derive from quotes what isn't in summary.json
  const sorted = quotes?.length ? [...quotes].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const lastQuote = sorted.at(-1);
  const cutoff52 = lastQuote ? new Date(new Date(lastQuote.date).getTime() - 365 * 86400000) : null;
  const yearQuotes = cutoff52 ? sorted.filter(q => new Date(q.date) >= cutoff52) : sorted;
  const high52 = yearQuotes.length ? Math.max(...yearQuotes.map(q => q.high ?? q.close)) : null;
  const low52  = yearQuotes.length ? Math.min(...yearQuotes.map(q => q.low  ?? q.close)) : null;
  const volume = lastQuote?.volume ?? null;

  // Market cap = currentPrice × sharesOutstanding
  const price = fd?.currentPrice;
  const shares = ks?.sharesOutstanding;
  const mcap = price != null && shares != null ? price * shares : null;

  // PEG: prefer ks.pegRatio, fall back to forward P/E label if missing
  const peg = ks?.pegRatio;

  const items = [
    { k: "Market Cap", v: fmtCompact(mcap) },
    { k: "Volume",     v: fmtVol(volume) },
    { k: "52w High",   v: high52 != null ? `$${high52.toFixed(2)}` : "—" },
    { k: "52w Low",    v: low52  != null ? `$${low52.toFixed(2)}`  : "—" },
    { k: "Day",   v: fmtPct(changePctOverBars(sorted, 1)),  pct: true },
    { k: "Week",  v: fmtPct(changePctOverBars(sorted, 5)),  pct: true },
    { k: "Month", v: fmtPct(changePctOverBars(sorted, 21)), pct: true },
    { k: "Year",  v: fmtPct(ks?.["52WeekChange"] ?? changePctOverBars(sorted, 252)), pct: true },
    { k: "PEG",    v: peg != null ? peg.toFixed(2) : "—" },
    { k: "Sector", v: sp?.sector ?? "—" },
  ];
  return (
    <div className="ticker-kpi-strip">
      {items.map(({ k, v, pct }) => {
        let cls = "";
        if (pct && v !== "—") { const n = parseFloat(v); cls = n > 0 ? "ticker-kpi-pos" : n < 0 ? "ticker-kpi-neg" : ""; }
        return (
          <div className="ticker-kpi" key={k}>
            <div className="ticker-kpi-k">{k}</div>
            <div className={`ticker-kpi-v ${cls}`}>{v}</div>
          </div>
        );
      })}
    </div>
  );
}

const MATRIX_TICKERS = ["NVDA", "MSFT", "AAPL", "PLTR", "FTNT"];

function pearsonLag(a, b, lag) {
  // lag > 0: b leads a (b[i] vs a[i+lag])
  const n = Math.min(a.length, b.length) - Math.abs(lag);
  if (n < 5) return null;
  const sa = lag >= 0 ? a.slice(lag) : a.slice(0, a.length + lag);
  const sb = lag >= 0 ? b.slice(0, b.length - lag) : b.slice(-lag);
  const len = Math.min(sa.length, sb.length);
  // log returns
  const ra = [], rb = [];
  for (let i = 1; i < len; i++) {
    if (sa[i] > 0 && sa[i-1] > 0) ra.push(Math.log(sa[i] / sa[i-1]));
    if (sb[i] > 0 && sb[i-1] > 0) rb.push(Math.log(sb[i] / sb[i-1]));
  }
  const l = Math.min(ra.length, rb.length);
  if (l < 5) return null;
  const ma = ra.slice(0, l).reduce((s, v) => s + v, 0) / l;
  const mb = rb.slice(0, l).reduce((s, v) => s + v, 0) / l;
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < l; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    va  += (ra[i] - ma) ** 2;
    vb  += (rb[i] - mb) ** 2;
  }
  const denom = Math.sqrt(va * vb);
  return denom === 0 ? null : num / denom;
}

function corrColor(v) {
  if (v == null) return "transparent";
  const intensity = Math.abs(v);
  return v > 0
    ? `oklch(0.45 ${0.15 * intensity} 150)`
    : `oklch(0.45 ${0.15 * intensity} 25)`;
}

function CorrMatrix({ ticker, sparklinesData, companies }) {
  const [lagDays, setLagDays] = useState(0);

  const tickers = useMemo(() => {
    const base = [...new Set([ticker, ...MATRIX_TICKERS])];
    // only keep tickers that exist in companies and have sparkline data
    const known = companies ? new Set(Object.values(companies)) : new Set();
    return base.filter(t => known.has(t) && sparklinesData?.[t]?.closes90?.length >= 10);
  }, [ticker, companies, sparklinesData]);

  const matrix = useMemo(() => {
    const m = {};
    for (const a of tickers) {
      m[a] = {};
      for (const b of tickers) {
        if (a === b) { m[a][b] = 1; continue; }
        m[a][b] = pearsonLag(sparklinesData[a].closes90, sparklinesData[b].closes90, lagDays);
      }
    }
    return m;
  }, [tickers, sparklinesData, lagDays]);

  if (tickers.length < 2) return null;

  return (
    <div className="corr-matrix-wrap">
      <div className="corr-matrix-toolbar">
        <span className="corr-matrix-label">Lag days (b leads a)</span>
        {[0, 1, 3, 7].map(d => (
          <button
            key={d}
            className={`corr-lag-btn${lagDays === d ? " corr-lag-btn--active" : ""}`}
            onClick={() => setLagDays(d)}
          >{d === 0 ? "None" : `+${d}d`}</button>
        ))}
      </div>
      <div className="corr-matrix" style={{ gridTemplateColumns: `40px repeat(${tickers.length}, 1fr)` }}>
        <div className="corr-cell" />
        {tickers.map(t => <div key={t} className="corr-cell corr-head">{t}</div>)}
        {tickers.map(a => (
          <>
            <div key={`lbl-${a}`} className="corr-cell corr-lbl">{a}</div>
            {tickers.map(b => {
              const v = matrix[a]?.[b];
              const isSel = a === ticker || b === ticker;
              return (
                <div
                  key={b}
                  className={`corr-cell${isSel ? " corr-sel" : ""}`}
                  style={{
                    background: a === b ? "transparent" : corrColor(v),
                    color: a === b ? "var(--text-faint)" : v == null ? "var(--text-faint)" : "white",
                  }}
                  title={v != null ? `${a} vs ${b}: ${v.toFixed(3)}` : "—"}
                >
                  {a === b ? "—" : v != null ? v.toFixed(2) : "—"}
                </div>
              );
            })}
          </>
        ))}
      </div>
      {lagDays > 0 && (
        <div className="corr-lag-note">Showing how {lagDays}d-lagged returns of column ticker correlate with row ticker</div>
      )}
    </div>
  );
}

const LAG_COLS = [1, 3, 7, 30, 60, 90];

function CorrLagTable({ ticker, sparklinesData, companies }) {
  const rows = useMemo(() => {
    if (!sparklinesData || !companies) return [];
    const base = sparklinesData[ticker]?.closes252;
    if (!base?.length) return [];
    return Object.entries(companies)
      .filter(([, t]) => t !== ticker)
      .map(([name, t]) => {
        const other = sparklinesData[t]?.closes252;
        if (!other?.length) return null;
        const cols = LAG_COLS.map(lag => pearsonLag(base, other, lag));
        return { ticker: t, name, cols };
      })
      .filter(Boolean);
  }, [ticker, sparklinesData, companies]);

  if (!rows.length) return null;

  return (
    <div className="corr-lag-table-wrap">
      <table className="corr-lag-table">
        <thead>
          <tr>
            <th className="clt-th clt-ticker">Ticker</th>
            <th className="clt-th clt-name">Company</th>
            {LAG_COLS.map(d => <th key={d} className="clt-th clt-val">+{d}d</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ticker: t, name, cols }) => (
            <tr key={t} className="clt-row">
              <td className="clt-td clt-ticker">{t}</td>
              <td className="clt-td clt-name">{name}</td>
              {cols.map((v, i) => {
                const bg = v == null ? "transparent" : corrColor(v);
                const fg = v == null ? "var(--text-faint)" : "white";
                return (
                  <td key={i} className="clt-td clt-val" style={{ background: bg, color: fg }}>
                    {v != null ? v.toFixed(2) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="corr-lag-note">Each column shows Pearson r of log-returns with base ticker leading by N trading days</div>
    </div>
  );
}

function WatchlistSparkline({ closes, color, id }) {
  const W = 52, H = 28;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const fillPts = `0,${H} ${pts} ${W},${H}`;
  const gradId = `spk-${id}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="ticker-wl-sparkline" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function Ticker() {
  const { ticker } = useParams();
  const [compareTicker, setCompareTicker] = useState("");
  const [period, setPeriod] = useState(null);
  const [correlagDays, setCorrelagDays] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(true);
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
  const HOUR = 60 * 60 * 1000;
  const { data: nvdData } = useQuery({
    queryKey: ["nvd-ticker", companyName],
    queryFn: withLsCache(`nvd_${companyName}`, HOUR, () => getNvd({ limit: 500, company: companyName })),
    enabled: !!companyName,
    staleTime: HOUR,
    gcTime: HOUR,
  });
  const { data: otxData } = useQuery({
    queryKey: ["otx-ticker", companyName],
    queryFn: withLsCache(`otx_${companyName}`, HOUR, () => getOtx({ limit: 500, company: companyName })),
    enabled: !!companyName,
    staleTime: HOUR,
    gcTime: HOUR,
  });
  const { data: kevData } = useQuery({
    queryKey: ["kev-ticker", companyName],
    queryFn: withLsCache(`kev_${companyName}`, HOUR, () => getKev({ limit: 500, company: companyName })),
    enabled: !!companyName,
    staleTime: HOUR,
    gcTime: HOUR,
  });
  const { data: correlationData, isFetching: correlationFetching } = useCorrelation(ticker, compareTicker, period, correlagDays);
  const { data: newsAnalysisData } = useQuery({
    queryKey: ["news-analysis", ticker],
    queryFn: withLsCache(`news_analysis_${ticker}`, HOUR, () => getNewsAnalysis(ticker)),
    enabled: !!ticker,
    staleTime: HOUR,
    gcTime: HOUR,
  });
  const newsArticles = useMemo(() => news?.news ?? [], [news?.news]);

  const allTickers = companies ? Object.values(companies) : [];
  const SPARKLINES_TTL = 24 * 60 * 60 * 1000;
  const { data: sparklinesData } = useQuery({
    queryKey: ["sparklines", allTickers.join(",")],
    queryFn: withLsCache("sparklines", SPARKLINES_TTL, () => getSparklines(allTickers)),
    enabled: allTickers.length > 0,
    staleTime: SPARKLINES_TTL,
    gcTime: SPARKLINES_TTL,
  });

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

  const sortedCompanies = companies
    ? Object.entries(companies).sort(([, a], [, b]) => a.localeCompare(b))
    : [];

  return (
    <div className={`ticker-layout${showChat ? " ticker-layout--chat-open" : ""}`}>
      <button
        className={`ticker-wl-toggle${showWatchlist ? " ticker-wl-toggle--open" : ""}`}
        onClick={() => setShowWatchlist(v => !v)}
        title={showWatchlist ? "Hide watchlist" : "Show watchlist"}
      >
        {showWatchlist ? "<" : "›"}
      </button>

      <aside className={`ticker-wl${showWatchlist ? "" : " ticker-wl--collapsed"}`}>
        <div className="ticker-wl-head">
          <div className="ticker-wl-title">Companies</div>
        </div>
        <div className="ticker-wl-list">
          {sortedCompanies.map(([name, t]) => {
            const sp = sparklinesData?.[t];
            const changePct = sp?.changePct ?? null;
            const changeClass = changePct == null ? "" : changePct >= 0 ? " ticker-wl-change--up" : " ticker-wl-change--down";
            const changeSign = changePct != null && changePct >= 0 ? "+" : "";
            const sparkColor = changePct == null ? "var(--text-faint)" : changePct >= 0 ? "var(--color-green, #22c55e)" : "var(--color-red, #ef4444)";
            return (
              <Link
                key={t}
                to={`/${t}`}
                className={`ticker-wl-row${t === ticker ? " is-active" : ""}`}
              >
                <div className="ticker-wl-info">
                  <div className="ticker-wl-meta">
                    <span className="ticker-wl-symbol">{t}</span>
                    {sp?.latestPrice != null && (
                      <span className="ticker-wl-price">${sp.latestPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="ticker-wl-meta">
                    <span className="ticker-wl-name">{name}</span>
                    {changePct != null && (
                      <span className={`ticker-wl-change${changeClass}`}>{changeSign}{changePct.toFixed(2)}%</span>
                    )}
                  </div>
                </div>
                {sp?.closes?.length > 1 && (
                  <WatchlistSparkline closes={sp.closes} color={sparkColor} id={t} />
                )}
              </Link>
            );
          })}
        </div>
      </aside>

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
          <TickerKPI summary={summary} quotes={allQuotes} />

          <PeriodButtons activeDays={period} onSelect={setPeriod} showCustomLabel />

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
          </div>

          <div className="chart-card">
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
          </div>

          {newsArticles.length > 0 && (
            <div className="chart-card">
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
            </div>
          )}

          {intelligenceArticles.data?.length > 0 && (
            <div className="chart-card">
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
            </div>
          )}

          {sparklinesData && (
            <div className="chart-card">
              <div className="chart-title-row">
                <h3 className="chart-title">Correlation Matrix</h3>
                <span className="chart-card-subtitle">90d · log-returns</span>
              </div>
              <CorrMatrix ticker={ticker} sparklinesData={sparklinesData} companies={companies} />
            </div>
          )}

          {sparklinesData && (
            <div className="chart-card">
              <div className="chart-title-row">
                <h3 className="chart-title">Lag Correlation Table</h3>
                <span className="chart-card-subtitle">all stocks · 1y history · base leads</span>
              </div>
              <CorrLagTable ticker={ticker} sparklinesData={sparklinesData} companies={companies} />
            </div>
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
