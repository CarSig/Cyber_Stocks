import { PERIODS } from '@/components/organisms/charts/utils/periods.js';

export default function PeriodButtons({ activeDays, onSelect, showCustomLabel = false }) {
  const isPreset = PERIODS.some((p) => p.days === activeDays);
  return (
    <>
      {PERIODS.map(({ label, days }) => (
        <button
          key={label}
          onClick={() => onSelect(days)}
          className={`btn btn-chart${activeDays === days ? ' active' : ''}`}
        >
          {label}
        </button>
      ))}
      {showCustomLabel && !isPreset && activeDays !== null && <span className="chart-period-label">{activeDays}d</span>}
    </>
  );
}
