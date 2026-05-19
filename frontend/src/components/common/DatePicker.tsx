import { useRef } from 'react';

type DatePickerProps = {
  value?: string | null;
  min?: string;
  max?: string;
  onChange: (value: string | null) => void;
  placeholder?: string;
};

export default function DatePicker({ value, min, max, onChange, placeholder = 'Pick a date' }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : placeholder;

  return (
    <div className="date-picker">
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker()}
        className={`date-picker-btn${value ? '' : ' date-picker-btn--empty'}`}
      >
        📅 {display}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value || null)}
        className="date-picker-input"
      />
    </div>
  );
}
