import { useMemo, useState } from 'react';
import { useStock } from '@/features/tickers/hooks/useStock';
import { ChartAuto, type ChartPlugin } from '@/features/charts';
import { toSortedOHLC } from '@/features/charts/utils/series';
import { useSecFiles } from '../hooks/useSecData';
import { secFilingsOverlay } from '../plugins/secFilingsOverlay';
import { OTHER_CATEGORIES, BASE_FORM_DESCRIPTIONS } from '../constants';

type Props = {
  ticker: string | null;
  visibleRange: { from: string; to: string } | null;
  onRangeChange: (range: { from: string; to: string }) => void;
  defaultRange: { from: string; to: string } | null;
  showVolatility: boolean;
  onVolatilityToggle: () => void;
};

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

  const { allQuotes } = useStock(ticker ?? '', {});
  const { data: filings = [] } = useSecFiles(ticker);

  const priceData = useMemo(() => toSortedOHLC(allQuotes ?? []), [allQuotes]);

  // Filings plugin is included only when toggled on, so the toggle drives
  // the chart's marker visibility AND the click-modal behavior together.
  const plugins: ChartPlugin[] = useMemo(
    () => (showFilings ? [secFilingsOverlay({ filings, defaultEnabled: true })] : []),
    [showFilings, filings],
  );

  if (!ticker) return null;
  const effectiveRange = visibleRange ?? defaultRange;

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
        <ChartAuto
          data={priceData}
          defaultType="Area"
          availableTypes={['Candlestick', 'Bar', 'Line', 'Area', 'Baseline']}
          visibleRange={effectiveRange}
          onRangeChange={onRangeChange}
          hidePeriodControls
          plugins={plugins}
          resize={{ enabled: true }}
        />
      )}
      {showLegend && <FilingsLegendModal onClose={() => setShowLegend(false)} />}
    </div>
  );
}
