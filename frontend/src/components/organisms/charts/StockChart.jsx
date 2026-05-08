import { useEffect, useRef, useState } from "react";
import "./charts.css";
import { createChart, createSeriesMarkers, CandlestickSeries, BarSeries, LineSeries, AreaSeries, BaselineSeries } from "lightweight-charts";
import { daysAgoString, todayString, toSortedOHLC } from "./chartUtils.js";
import { buildMarkers, buildCountMarkers, buildNvdMarkers, buildTrumpMarkers, buildNewsMarkers } from "./chartMarkers.js";
import ChartToggleButton from "../../atoms/ChartToggleButton.jsx";
import ModalItem from "../../atoms/ModalItem.jsx";

const CHART_TYPES = ["Candlestick", "Bar", "Line", "Area", "Baseline"];

const SERIES_MAP = {
  Candlestick: CandlestickSeries,
  Bar: BarSeries,
  Line: LineSeries,
  Area: AreaSeries,
  Baseline: BaselineSeries,
};

const NVD_SEVERITY_COLORS = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#60a5fa", UNKNOWN: "#6b7280" };
const SENTIMENT_COLORS = { positive: "#22c55e", negative: "#ef4444", neutral: "#eab308" };

// Keeps a ref always in sync with a prop without cluttering the component body
function useSyncRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}


export default function StockChart({
  quotes, compareQuotes, compareName, analysis, period, onPeriodChange,
  trumpPosts, showTrump, onTrumpToggle,
  nvdVulns, showNvd, onNvdToggle,
  otxPulses, showOtx, onOtxToggle,
  kevItems, showKev, onKevToggle,
  newsArticles, newsAnalysis, showNews, onNewsToggle,
  onShowCorrelations,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const skipRangeRef = useRef(false);
  const periodRef = useRef(period);
  const [type, setType] = useState("Area");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [markerModal, setMarkerModal] = useState(null);

  const newsArticlesRef = useSyncRef(newsArticles);
  const newsAnalysisRef = useSyncRef(newsAnalysis);
  const showNewsRef    = useSyncRef(showNews);
  const trumpPostsRef  = useSyncRef(trumpPosts);
  const showTrumpRef   = useSyncRef(showTrump);
  const nvdVulnsRef    = useSyncRef(nvdVulns);
  const showNvdRef     = useSyncRef(showNvd);
  const otxPulsesRef   = useSyncRef(otxPulses);
  const showOtxRef     = useSyncRef(showOtx);
  const kevItemsRef    = useSyncRef(kevItems);
  const showKevRef     = useSyncRef(showKev);

  useEffect(() => { periodRef.current = period; }, [period]);

  useEffect(() => {
    if (!chartRef.current) return;
    skipRangeRef.current = true;
    if (period === null) {
      chartRef.current.timeScale().fitContent();
    } else {
      chartRef.current.timeScale().setVisibleRange({ from: daysAgoString(period), to: todayString() });
    }
    setTimeout(() => { skipRangeRef.current = false; }, 150);
  }, [period]);

  useEffect(() => {
    const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: true },
    });
    chartRef.current = chart;

    const primary = chart.addSeries(SERIES_MAP[type]);
    const sorted = toSortedOHLC(quotes);
    primary.setData(sorted);
    const minDate = sorted[0]?.time;
    const maxDate = sorted[sorted.length - 1]?.time;
    const inRange = (m) => (!minDate || m.time >= minDate) && (!maxDate || m.time <= maxDate);

    const markers = [
      ...(showAnalysis ? buildMarkers(analysis) : []),
      ...(showTrump ? buildTrumpMarkers(trumpPosts, quotes) : []),
      ...(showNvd ? buildNvdMarkers(nvdVulns) : []),
      ...(showOtx ? buildCountMarkers(otxPulses, { dateField: "created",   position: "belowBar", color: "#a855f7", shape: "circle",    label: "OTX" }) : []),
      ...(showKev ? buildCountMarkers(kevItems,  { dateField: "dateAdded", position: "belowBar", color: "#f97316", shape: "arrowDown", label: "KEV" }) : []),
      ...(showNews ? buildNewsMarkers(newsArticles, newsAnalysis, quotes) : []),
    ].filter(inRange).sort((a, b) => (a.time < b.time ? -1 : 1));

    const dedupedMarkers = [...new Map(markers.map((m) => [`${m.time}|${m.position}|${m.color}`, m])).values()];
    if (dedupedMarkers.length) createSeriesMarkers(primary, dedupedMarkers);

    if (compareQuotes?.length) {
      const compare = chart.addSeries(LineSeries, { color: cv("--color-amber"), lineWidth: 2, priceScaleId: "compare" });
      compare.setData(toSortedOHLC(compareQuotes));
      chart.priceScale("compare").applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    }

    skipRangeRef.current = true;
    if (periodRef.current === null) {
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleRange({ from: daysAgoString(periodRef.current), to: todayString() });
    }

    const rangeTimer = setTimeout(() => {
      skipRangeRef.current = false;
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (skipRangeRef.current || !range) return;
        const days = Math.round((new Date(range.to) - new Date(range.from)) / 86400000);
        onPeriodChange?.(days);
      });
    }, 150);

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const date = typeof param.time === "string" ? param.time : new Date(param.time * 1000).toISOString().slice(0, 10);

      if (showNewsRef.current) {
        const items = (newsArticlesRef.current ?? []).filter((a) => {
          if (!a.providerPublishTime || !a.link) return false;
          const ts = a.providerPublishTime;
          const d = new Date(typeof ts === "number" || (typeof ts === "string" && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts).toISOString().slice(0, 10);
          return d === date && (newsAnalysisRef.current?.[a.link]?.sentiment ?? null) !== null;
        });
        if (items.length) { setMarkerModal({ type: "news", date, items }); return; }
      }

      const overlays = [
        { showRef: showTrumpRef, dataRef: trumpPostsRef, type: "trump", filter: (p) => p.created_at?.slice(0, 10) === date },
        { showRef: showNvdRef,   dataRef: nvdVulnsRef,   type: "nvd",   filter: (v) => v.published?.slice(0, 10) === date },
        { showRef: showOtxRef,   dataRef: otxPulsesRef,  type: "otx",   filter: (p) => p.created?.slice(0, 10) === date },
        { showRef: showKevRef,   dataRef: kevItemsRef,   type: "kev",   filter: (v) => v.dateAdded === date },
      ];
      for (const { showRef, dataRef, type: t, filter } of overlays) {
        if (!showRef.current) continue;
        const items = (dataRef.current ?? []).filter(filter);
        if (items.length) { setMarkerModal({ type: t, date, items }); return; }
      }
    });

    const observer = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(rangeTimer);
      chartRef.current = null;
      observer.disconnect();
      chart.remove();
    };
  }, [quotes, compareQuotes, type, analysis, showAnalysis, showTrump, trumpPosts, showNvd, nvdVulns, showOtx, otxPulses, showKev, kevItems, showNews, newsArticles, newsAnalysis]);

  return (
    <div>
      <div className="chart-toolbar">
        {CHART_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-chart${type === t ? " active" : ""}`}>
            {t}
          </button>
        ))}
        {compareName && <span className="chart-compare-label">● {compareName}</span>}
        <ChartToggleButton visible={trumpPosts?.length > 0}   active={showTrump} onClick={() => onTrumpToggle?.(!showTrump)}>Trump</ChartToggleButton>
        <ChartToggleButton visible={nvdVulns?.length > 0}    active={showNvd}   onClick={() => onNvdToggle?.(!showNvd)}>NVD</ChartToggleButton>
        <ChartToggleButton visible={otxPulses?.length > 0}   active={showOtx}   onClick={() => onOtxToggle?.(!showOtx)}>OTX</ChartToggleButton>
        <ChartToggleButton visible={kevItems?.length > 0}    active={showKev}   onClick={() => onKevToggle?.(!showKev)}>KEV</ChartToggleButton>
        <ChartToggleButton visible={newsArticles?.length > 0} active={showNews}  onClick={() => onNewsToggle?.(!showNews)}>News</ChartToggleButton>
        {onShowCorrelations && (
          <ChartToggleButton onClick={onShowCorrelations}>Correlations</ChartToggleButton>
        )}
        <ChartToggleButton active={showAnalysis} onClick={() => setShowAnalysis((v) => !v)}>Biggest Swings</ChartToggleButton>
      </div>
      <div ref={containerRef} className="chart-container" />

      {markerModal && (
        <div className="news-modal-overlay" onClick={() => setMarkerModal(null)}>
          <div className="news-modal" onClick={(e) => e.stopPropagation()}>
            <div className="news-modal-header">
              <span className="news-modal-date">{markerModal.date}</span>
              <button className="news-modal-close" onClick={() => setMarkerModal(null)}>✕</button>
            </div>
            <div className="news-modal-list">
              {markerModal.type === "news" && markerModal.items.map((a) => {
                const score = newsAnalysis?.[a.link]?.sentiment ?? null;
                const color = score === null ? "var(--text-muted)" : score >= 0.1 ? "var(--color-green)" : score <= -0.1 ? "var(--color-red)" : "var(--color-amber)";
                const icon = score === null ? "?" : score >= 0.1 ? "▲" : score <= -0.1 ? "▼" : "●";
                return <ModalItem key={a.link} href={a.link} icon={icon} iconColor={color} title={a.title} subtitle={a.publisher} />;
              })}
              {markerModal.type === "trump" && markerModal.items.map((p, i) => {
                const s = p.analysis?.sentiment ?? "neutral";
                return <ModalItem key={i} icon={s === "positive" ? "▲" : s === "negative" ? "▼" : "●"} iconColor={SENTIMENT_COLORS[s]} title={p.content} subtitle={p.created_at?.slice(0, 16).replace("T", " ")} />;
              })}
              {markerModal.type === "nvd" && markerModal.items.map((v, i) => (
                <ModalItem key={i} href={`https://nvd.nist.gov/vuln/detail/${v.cveId ?? v.cveID}`} icon="●" iconColor={NVD_SEVERITY_COLORS[v.severity ?? "UNKNOWN"]} title={`${v.cveId ?? v.cveID} — ${v.description}`} subtitle={v.severity ?? "UNKNOWN"} />
              ))}
              {markerModal.type === "otx" && markerModal.items.map((p, i) => (
                <ModalItem key={i} icon="●" iconColor="#a855f7" title={p.name} subtitle={p.created?.slice(0, 10)} />
              ))}
              {markerModal.type === "kev" && markerModal.items.map((v, i) => (
                <ModalItem key={i} href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`} icon="▼" iconColor="#f97316" title={`${v.cveID} — ${v.vulnerabilityName}`} subtitle={`${v.vendorProject} / ${v.product}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
