type FilterBannerProps = {
  label: string;
  value: string;
  onClear: () => void;
};

export default function FilterBanner({ label, value, onClear }: FilterBannerProps) {
  return (
    <div className="filter-banner">
      <span className="filter-banner-label">{label}</span>
      <span className="filter-banner-value">{value}</span>
      <button className="filter-banner-clear" onClick={onClear}>
        Clear filter
      </button>
    </div>
  );
}
