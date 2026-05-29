import { useMemo, useState } from 'react';
import { useStock } from '@/features/tickers/hooks/useStock';
import { ChartAuto, PRICE_SCALE_MIN_WIDTH, type ChartPlugin } from '@/features/charts';
import { toSortedOHLC } from '@/features/charts/utils/series';

type Props = {
  ticker: string | null;
  visibleRange: { from: string; to: string } | null;
  onRangeChange: (range: { from: string; to: string }) => void;
  defaultRange: { from: string; to: string } | null;
  /** Filing-marker overlay(s) for this chart, built by the parent. */
  plugins?: ChartPlugin[];
};

export default function SecPriceChart({ ticker, visibleRange, onRangeChange, defaultRange, plugins = [] }: Props) {
  const [visible, setVisible] = useState(true);

  const { allQuotes } = useStock(ticker ?? '', {});
  const priceData = useMemo(() => toSortedOHLC(allQuotes ?? []), [allQuotes]);

  if (!ticker) return null;
  const effectiveRange = visibleRange ?? defaultRange;

  return (
    <div className="sec-price-chart-wrap">
      <div className="sec-price-chart-header">
        <span className="sec-section-title" style={{ margin: 0 }}>
          Price — {ticker}
        </span>
        <div className="sec-price-chart-controls">
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
          topScaleMargin={0.18}
          priceScaleMinWidth={PRICE_SCALE_MIN_WIDTH}
        />
      )}
    </div>
  );
}
