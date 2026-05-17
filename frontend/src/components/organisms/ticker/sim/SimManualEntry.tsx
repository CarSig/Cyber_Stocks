import { Button } from '@/components/ui/button';

type Side = 'buy' | 'sell';

type SimManualEntryProps = {
  side: Side;
  onSideChange: (s: Side) => void;
  value: string;
  onValueChange: (v: string) => void;
  onAdd: () => void;
  // Render the time/date input — differs between long-term (DatePicker) and daytrade (time input)
  inputSlot: React.ReactNode;
};

export default function SimManualEntry({ side, onSideChange, value, onValueChange, onAdd, inputSlot }: SimManualEntryProps) {
  return (
    <div className="dtrade-manual">
      <span className="dtrade-label">Manual:</span>
      {inputSlot}
      <select className="dtrade-inline-select" value={side} onChange={(e) => onSideChange(e.target.value as Side)}>
        <option value="buy">Buy ($)</option>
        <option value="sell">Sell (%)</option>
      </select>
      <input
        type="number"
        className="dtrade-price-input"
        min="0"
        max={side === 'sell' ? 100 : undefined}
        step="any"
        placeholder={side === 'buy' ? 'Amount ($)' : 'Percent (0–100)'}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
      <Button variant="outline" onClick={onAdd}>Add</Button>
    </div>
  );
}
