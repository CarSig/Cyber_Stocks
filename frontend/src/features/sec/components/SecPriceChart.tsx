import { useRef, useState, useEffect, useMemo } from 'react';
import type { SeriesMarker, Time } from 'lightweight-charts';
import { useChartInstance } from '@/features/charts/hooks/useChartInstance';
import { useChartRange } from '@/features/charts/hooks/useChartRange';
import { useStock } from '@/features/tickers/hooks/useStock';
import { useOverlayRefs } from '@/features/charts/hooks/useOverlayRefs';
import { useSecFiles } from '../hooks/useSecData';
import type { ChartType } from '@/features/charts/hooks/useChartInstance';
import type { SecFileListing } from '../api';
import { buildFilingMarkers } from '../utils';
import { OTHER_CATEGORIES, BASE_FORM_DESCRIPTIONS } from '../constants';

type Props = {
  ticker: string | null;
  visibleRange: { from: string; to: string } | null;
  onRangeChange: (range: { from: string; to: string }) => void;
  defaultRange: { from: string; to: string } | null;
  showVolatility: boolean;
  onVolatilityToggle: () => void;
};

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 320;
const MAX_HEIGHT = 700;

function FilingsLegendModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'base' | string>('base');
  const otherCategory = OTHER_CATEGORIES.find((c) => c.tab === tab);

  return (
    <div className="sec-legend-backdrop" onClick={onClose}>
      <div className="sec-legend-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sec-legend-header">
          <span className="sec-legend-title">Filing Types</span>
          <button type="button" className="sec-legend-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sec-legend-tabs">
          <button
            type="button"
            className={`sec-legend-tab${tab === 'base' ? ' active' : ''}`}
            onClick={() => setTab('base')}
          >
            Base
          </button>
          {OTHER_CATEGORIES.map((c) => (
            <button
              key={c.tab}
              type="button"
              className={`sec-legend-tab${tab === c.tab ? ' active' : ''}`}
              onClick={() => setTab(c.tab)}
            >
              {c.tab}
            </button>
          ))}
        </div>

        {tab !== 'base' && (
          <div className="sec-legend-disclaimer">Greyed out filing types are not currently downloaded or analyzed.</div>
        )}

        <div className="sec-legend-rows">
          {tab === 'base'
            ? BASE_FORM_DESCRIPTIONS.map((f) => (
                <div key={f.label} className="sec-legend-row">
                  <span className="sec-legend-swatch" style={{ background: f.color }} />
                  <span className="sec-legend-label">{f.label}</span>
                  <span className="sec-legend-desc">{f.desc}</span>
                </div>
              ))
            : otherCategory?.forms.map((f) => (
                <div key={f.label} className="sec-legend-row">
                  {f.color ? (
                    <span className="sec-legend-swatch" style={{ background: f.color }} />
                  ) : (
                    <span className="sec-legend-swatch sec-legend-swatch--muted" />
                  )}
                  <span className={`sec-legend-label${f.color ? '' : ' sec-legend-label--muted'}`}>{f.label}</span>
                  <span className="sec-legend-desc">{f.desc}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

export default function SecPriceChart({
  ticker,
  visibleRange,
  onRangeChange,
  defaultRange,
  showVolatility,
  onVolatilityToggle,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [showFilings, setShowFilings] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(DEFAULT_HEIGHT);

  const { allQuotes } = useStock(ticker ?? '', {});
  const { data: filings = [] } = useSecFiles(ticker);
  const overlayRefs = useOverlayRefs({});

  const extraMarkers = useMemo(() => (showFilings ? buildFilingMarkers(filings) : []), [showFilings, filings]);

  const chartRef = useChartInstance(containerRef, {
    quotes: ticker ? allQuotes : [],
    type: 'Area' as ChartType,
    analysis: null,
    showAnalysis: false,
    overlayRefs,
    extraMarkers,
  });

  const effectiveRange = visibleRange ?? defaultRange;
  useChartRange(chartRef, { visibleRange: effectiveRange, onRangeChange });

  function onHandleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setHeight((h) => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h - e.deltaY * 0.5)));
  }

  function onHandleMouseDown(e: React.MouseEvent) {
    dragStartY.current = e.clientY;
    dragStartH.current = height;
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragStartY.current === null) return;
      const delta = e.clientY - dragStartY.current;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta)));
    }
    function onMouseUp() {
      dragStartY.current = null;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && containerRef.current) {
      chartRef.current.applyOptions({ height, width: containerRef.current.clientWidth });
    }
  }, [height, chartRef]);

  if (!ticker) return null;

  return (
    <div className="sec-price-chart-wrap">
      <div className="sec-price-chart-header">
        <span className="sec-section-title" style={{ margin: 0 }}>
          Price — {ticker}
        </span>
        <div className="sec-price-chart-controls">
          <button
            type="button"
            className={`btn btn-chart${showFilings ? ' active' : ''}`}
            onClick={() => setShowFilings((v) => !v)}
          >
            Filings
          </button>
          <button type="button" className="btn btn-chart" onClick={() => setShowLegend(true)}>
            ?
          </button>
          <button
            type="button"
            className={`btn btn-chart${showVolatility ? ' active' : ''}`}
            onClick={onVolatilityToggle}
          >
            Volatility
          </button>
          <button type="button" className="btn btn-chart" onClick={() => setVisible((v) => !v)}>
            {visible ? 'Hide' : 'Show'} chart
          </button>
        </div>
      </div>

      {visible && (
        <>
          <div ref={containerRef} className="chart-container sec-price-chart-canvas" style={{ height }} />
          <div
            className="sec-price-chart-resize-handle"
            onMouseDown={onHandleMouseDown}
            onWheel={onHandleWheel}
            title="Drag or scroll to resize"
          />
        </>
      )}
      {showLegend && <FilingsLegendModal onClose={() => setShowLegend(false)} />}
    </div>
  );
}
