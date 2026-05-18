import { Button } from '@/components/ui/button';
import DatePicker from '@/components/atoms/DatePicker';

type ManualEntryProps = {
  side: string;
  onSideChange: (s: string) => void;
  sideOptions?: { value: string; label: string }[];
  value: string;
  onValueChange: (v: string) => void;
  onAdd: () => void;
  /** Which type of date/time input to render */
  inputType: 'time' | 'date';
  /** Current value of the date/time input */
  inputValue: string;
  /** Called when the date/time input changes */
  onInputChange: (v: string) => void;
  /** Min date (only used when inputType='date') */
  minDate?: string;
  /** Max date (only used when inputType='date') */
  maxDate?: string;
};

const DEFAULT_OPTIONS: { value: string; label: string }[] = [
  { value: 'buy', label: 'Buy ($)' },
  { value: 'sell', label: 'Sell (%)' },
];

export default function ManualEntry({
  side,
  onSideChange,
  sideOptions = DEFAULT_OPTIONS,
  value,
  onValueChange,
  onAdd,
  inputType,
  inputValue,
  onInputChange,
  minDate,
  maxDate,
}: ManualEntryProps) {
  const isExit = side === 'sell' || side === 'cover';
  return (
    <div className="dtrade-manual">
      <span className="dtrade-label">Manual:</span>
      {inputType === 'time' ? (
        <input
          className="alpaca-input"
          type="time"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
        />
      ) : (
        <DatePicker value={inputValue} min={minDate} max={maxDate} onChange={(v) => onInputChange(v ?? '')} />
      )}
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
