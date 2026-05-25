import { useChartContext } from '../ChartContext';

export function TypeControls() {
  const { type, setType, availableTypes } = useChartContext('Chart.TypeControls');
  return (
    <>
      {availableTypes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setType(t)}
          className={`btn btn-chart${type === t ? ' active' : ''}`}
        >
          {t}
        </button>
      ))}
    </>
  );
}
