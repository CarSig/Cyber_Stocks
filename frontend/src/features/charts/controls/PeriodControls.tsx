import { useChartContext } from '../ChartContext';

const LABELS: Record<number, string> = {
  1: '1D',
  7: '1W',
  30: '1M',
  90: '3M',
  180: '6M',
  365: '1Y',
};

export function PeriodControls() {
  const { selectedPeriod, onPeriodChange, availablePeriods } = useChartContext('Chart.PeriodControls');
  if (!onPeriodChange) return null;
  return (
    <>
      {availablePeriods.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onPeriodChange(d)}
          className={`btn btn-chart${selectedPeriod === d ? ' active' : ''}`}
        >
          {LABELS[d] ?? `${d}D`}
        </button>
      ))}
    </>
  );
}
