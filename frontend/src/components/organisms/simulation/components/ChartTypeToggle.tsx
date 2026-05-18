type ChartType = 'line' | 'area' | 'candlestick';

type ChartTypeToggleProps = {
  chartType: ChartType;
  onChange: (t: ChartType) => void;
  extraButtons?: React.ReactNode;
};

const CHART_TYPES: ChartType[] = ['line', 'area', 'candlestick'];

export default function ChartTypeToggle({ chartType, onChange, extraButtons }: ChartTypeToggleProps) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {CHART_TYPES.map((t) => (
        <button
          key={t}
          className={`sim-chart-btn${chartType === t ? ' active' : ''}`}
          onClick={() => onChange(t)}
          type="button"
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
      {extraButtons}
    </div>
  );
}
