import { PERIODS } from '../utils/periods';

type PeriodButtonsProps = {
  activeDays?: number | null;
  onSelect: (days: number | null) => void;
  showCustomLabel?: boolean;
};

export default function PeriodButtons({ activeDays, onSelect, showCustomLabel = false }: PeriodButtonsProps) {
  const isPreset = activeDays != null && PERIODS.some((p) => p.days === activeDays);
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
