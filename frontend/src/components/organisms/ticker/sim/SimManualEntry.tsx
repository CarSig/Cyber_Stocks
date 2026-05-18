import { Button } from '@/components/ui/button';

type SimManualEntryProps = {
  side: string;
  onSideChange: (s: string) => void;
  sideOptions?: { value: string; label: string }[];
  value: string;
  onValueChange: (v: string) => void;
  onAdd: () => void;
  // Render the time/date input — differs between long-term (DatePicker) and daytrade (time input)
  inputSlot: React.ReactNode;
};

const DEFAULT_OPTIONS: { value: string; label: string }[] = [
  { value: 'buy', label: 'Buy ($)' },
  { value: 'sell', label: 'Sell (%)' },
];

export default function SimManualEntry({
  side,
  onSideChange,
  sideOptions = DEFAULT_OPTIONS,
  value,
  onValueChange,
  onAdd,
  inputSlot,
}: SimManualEntryProps) {
  const isExit = side === 'sell' || side === 'cover';
  return (
    <div className="dtrade-manual">
      <span className="dtrade-label">Manual:</span>
      {inputSlot}
      <select className="dtrade-inline-select" value={side} onChange={(e) => onSideChange(e.target.value)}>
        {sideOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        className="dtrade-price-input"
        min="0"
        max={isExit ? 100 : undefined}
        step="any"
        placeholder={isExit ? 'Percent (0–100)' : 'Amount ($)'}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
      <Button variant="outline" onClick={onAdd}>
        Add
      </Button>
    </div>
  );
}
