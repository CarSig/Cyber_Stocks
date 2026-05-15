import { useRef, useState } from 'react';
import './charts.css';
import { useOverlayRefs } from '@/hooks/charts/useOverlayRefs.js';
import { useChartInstance } from '@/hooks/charts/useChartInstance.js';
import { useChartRange } from '@/hooks/charts/useChartRange.js';
import { useChartClickHandler } from '@/hooks/charts/useChartClickHandler.js';
import ChartToggleButton from '@/components/atoms/ChartToggleButton.jsx';
import ModalItem from '@/components/atoms/ModalItem.jsx';
import ChartModal from './ChartModal.jsx';
import { sentimentScoreStyle } from './utils/colors.js';
import { NVD_SEVERITY_COLORS, SENTIMENT_COLORS } from './utils/markers.js';

const CHART_TYPES = ['Candlestick', 'Bar', 'Line', 'Area', 'Baseline'];

function OverlayToggles({ trump, nvd, otx, kev, news, showAnalysis, onAnalysisToggle }) {
  const { posts: trumpPosts, show: showTrump, onToggle: onTrumpToggle } = trump;
  const { data: nvdVulns, show: showNvd, onToggle: onNvdToggle } = nvd;
  const { data: otxPulses, show: showOtx, onToggle: onOtxToggle } = otx;
  const { data: kevItems, show: showKev, onToggle: onKevToggle } = kev;
  const { articles: newsArticles, show: showNews, onToggle: onNewsToggle } = news;
  return (
    <>
      <ChartToggleButton
        visible={trumpPosts?.length > 0}
        active={showTrump}
        onClick={() => onTrumpToggle?.(!showTrump)}
      >
        Trump
      </ChartToggleButton>
      <ChartToggleButton visible={nvdVulns?.length > 0} active={showNvd} onClick={() => onNvdToggle?.(!showNvd)}>
        NVD
      </ChartToggleButton>
      <ChartToggleButton visible={otxPulses?.length > 0} active={showOtx} onClick={() => onOtxToggle?.(!showOtx)}>
        OTX
      </ChartToggleButton>
      <ChartToggleButton visible={kevItems?.length > 0} active={showKev} onClick={() => onKevToggle?.(!showKev)}>
        KEV
      </ChartToggleButton>
      <ChartToggleButton visible={newsArticles?.length > 0} active={showNews} onClick={() => onNewsToggle?.(!showNews)}>
        News
      </ChartToggleButton>
      <ChartToggleButton active={showAnalysis} onClick={onAnalysisToggle}>
        Biggest Swings
      </ChartToggleButton>
    </>
  );
}

function MarkerModalItems({ type, items, newsAnalysis }) {
  switch (type) {
    case 'news':
      return items.map((a) => {
        const score = newsAnalysis?.[a.link]?.sentiment ?? null;
        const { color, icon } = sentimentScoreStyle(score);
        return (
          <ModalItem key={a.link} href={a.link} icon={icon} iconColor={color} title={a.title} subtitle={a.publisher} />
        );
      });
    case 'trump':
      return items.map((p, i) => {
        const s = p.analysis?.sentiment ?? 'neutral';
        return (
          <ModalItem
            key={i}
            icon={s === 'positive' ? '▲' : s === 'negative' ? '▼' : '●'}
            iconColor={SENTIMENT_COLORS[s]}
            title={p.content}
            subtitle={p.created_at?.slice(0, 16).replace('T', ' ')}
          />
        );
      });
    case 'nvd':
      return items.map((v, i) => (
        <ModalItem
          key={i}
          href={`https://nvd.nist.gov/vuln/detail/${v.cveId ?? v.cveID}`}
          icon="●"
          iconColor={NVD_SEVERITY_COLORS[v.severity ?? 'UNKNOWN']}
          title={`${v.cveId ?? v.cveID} — ${v.description}`}
          subtitle={v.severity ?? 'UNKNOWN'}
        />
      ));
    case 'otx':
      return items.map((p, i) => (
        <ModalItem key={i} icon="●" iconColor="#a855f7" title={p.name} subtitle={p.created?.slice(0, 10)} />
      ));
    case 'kev':
      return items.map((v, i) => (
        <ModalItem
          key={i}
          href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`}
          icon="▼"
          iconColor="#f97316"
          title={`${v.cveID} — ${v.vulnerabilityName}`}
          subtitle={`${v.vendorProject} / ${v.product}`}
        />
      ));
    default:
      return null;
  }
}

export default function StockChart({
  quotes,
  compareQuotes,
  compareName,
  analysis,
  period,
  onPeriodChange,
  visibleRange,
  onRangeChange,
  overlays = {},
}) {
  const { trump = {}, nvd = {}, otx = {}, kev = {}, news = {} } = overlays;
  const containerRef = useRef(null);
  const [type, setType] = useState('Area');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [markerModal, setMarkerModal] = useState(null);

  const overlayRefs = useOverlayRefs({ trump, nvd, otx, kev, news });
  const chartRef = useChartInstance(containerRef, { quotes, compareQuotes, type, analysis, showAnalysis, overlayRefs });
  useChartRange(chartRef, { period, visibleRange, onPeriodChange, onRangeChange });
  useChartClickHandler(chartRef, overlayRefs, setMarkerModal);

  return (
    <div>
      <div className="chart-toolbar">
        {CHART_TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`btn btn-chart${type === t ? ' active' : ''}`}>
            {t}
          </button>
        ))}
        {compareName && <span className="chart-compare-label">● {compareName}</span>}
        <OverlayToggles
          trump={trump}
          nvd={nvd}
          otx={otx}
          kev={kev}
          news={news}
          showAnalysis={showAnalysis}
          onAnalysisToggle={() => setShowAnalysis((v) => !v)}
        />
      </div>
      <div ref={containerRef} className="chart-container" />

      {markerModal && (
        <ChartModal date={markerModal.date} onClose={() => setMarkerModal(null)}>
          <MarkerModalItems type={markerModal.type} items={markerModal.items} newsAnalysis={news.analysis} />
        </ChartModal>
      )}
    </div>
  );
}
